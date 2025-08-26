const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const { createConsumer, TOPICS } = require('../config/kafka');
const Redis = require('redis');

class Gateway {
  constructor(port = 8000) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.consumer = createConsumer('gateway-group');
    this.redis = Redis.createClient({ url: 'redis://localhost:6379' });
    this.userConnections = new Map(); // user_id -> WebSocket[]
    this.dedupCache = new Map(); // (user_id, reel_id) -> timestamp
    this.isRunning = false;
  }

  async connect() {
    try {
      // Connect to Redis for deduplication
      await this.redis.connect();
      console.log('Connected to Redis');

      // Connect to Kafka
      await this.consumer.connect();
      await this.consumer.subscribe({ 
        topics: [TOPICS.RANKED_FEED_UPDATES, TOPICS.ENGAGEMENT_EVENTS],
        fromBeginning: false 
      });
      console.log('Gateway connected to Kafka');

    } catch (error) {
      console.error('Gateway connection failed:', error);
      throw error;
    }
  }

  async start() {
    // Setup Express middleware
    this.app.use(cors());
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });

    // User connection endpoint for authentication (mock)
    this.app.post('/connect/:userId', (req, res) => {
      const userId = req.params.userId;
      res.json({ 
        success: true, 
        userId,
        wsUrl: `ws://localhost:${this.port}/ws/${userId}`
      });
    });

    // Start HTTP server
    this.server = this.app.listen(this.port, () => {
      console.log(`Gateway HTTP server running on port ${this.port}`);
    });

    // Setup WebSocket server
    this.wss = new WebSocket.Server({ 
      server: this.server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      const userId = this.extractUserIdFromUrl(req.url);
      
      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      this.handleWebSocketConnection(ws, userId);
    });

    // Start Kafka consumer
    this.isRunning = true;
    await this.startKafkaConsumer();
  }

  extractUserIdFromUrl(url) {
    // Extract user ID from WebSocket URL path
    const match = url.match(/\/ws\/(.+)/);
    return match ? match[1] : null;
  }

  handleWebSocketConnection(ws, userId) {
    console.log(`User ${userId} connected via WebSocket`);

    // Add to user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, []);
    }
    this.userConnections.get(userId).push(ws);

    // Handle WebSocket messages (engagement events)
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleEngagementEvent(message, userId);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`User ${userId} disconnected`);
      const connections = this.userConnections.get(userId) || [];
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.userConnections.delete(userId);
      }
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now()
    }));
  }

  async startKafkaConsumer() {
    await this.consumer.run({
      autoCommit: false,
      partitionsConsumedConcurrently: 5,
      eachMessage: async ({ topic, partition, message, heartbeat }) => {
        try {
          await heartbeat();

          if (topic === TOPICS.RANKED_FEED_UPDATES) {
            await this.handleFeedUpdate(message);
          } else if (topic === TOPICS.ENGAGEMENT_EVENTS) {
            await this.handleEngagementUpdate(message);
          }

          // Commit after successful processing
          await this.consumer.commitOffsets([{
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString()
          }]);

        } catch (error) {
          console.error(`Error processing message from ${topic}:`, error);
        }
      }
    });
  }

  async handleFeedUpdate(message) {
    const feedUpdate = JSON.parse(message.value.toString());
    const correlationId = message.headers['x-corr-id']?.toString();
    const publishTs = message.headers['x-publish-ts']?.toString();
    const fanoutTs = message.headers['x-fanout-ts']?.toString();

    // Calculate end-to-end latency
    const currentTime = Date.now();
    const e2eLatency = publishTs ? currentTime - parseInt(publishTs) : null;

    // Deduplication check
    const dedupKey = `${feedUpdate.user_id}:${feedUpdate.reel_id}`;
    if (await this.isDuplicate(dedupKey)) {
      console.log(`Duplicate detected for ${dedupKey}, skipping`);
      return;
    }

    // Mark as seen for deduplication
    await this.markAsSeen(dedupKey);

    // Send to connected user
    const connections = this.userConnections.get(feedUpdate.user_id) || [];
    if (connections.length > 0) {
      const payload = {
        type: 'new_reel',
        data: feedUpdate.reel_data,
        correlationId,
        timestamp: currentTime,
        e2eLatency
      };

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
        }
      });

      console.log(`Sent reel ${feedUpdate.reel_id} to user ${feedUpdate.user_id} (${connections.length} connections), e2e: ${e2eLatency}ms`);
    }
  }

  async handleEngagementEvent(eventData, userId) {
    // Validate and forward engagement events to Kafka
    const ReelProducer = require('./producer');
    const producer = new ReelProducer();
    
    try {
      await producer.connect();
      await producer.publishEngagementEvent({
        ...eventData,
        user_id: userId,
        timestamp: Date.now()
      });
      await producer.disconnect();
    } catch (error) {
      console.error('Failed to publish engagement event:', error);
    }
  }

  async handleEngagementUpdate(message) {
    // Handle real-time engagement updates (like count updates, etc.)
    const engagementData = JSON.parse(message.value.toString());
    
    // Broadcast to all connected users (or specific users based on logic)
    this.userConnections.forEach((connections, userId) => {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'engagement_update',
            data: engagementData,
            timestamp: Date.now()
          }));
        }
      });
    });
  }

  async isDuplicate(dedupKey) {
    try {
      const exists = await this.redis.exists(dedupKey);
      return exists === 1;
    } catch (error) {
      console.error('Dedup check failed:', error);
      return false; // Fail open to avoid blocking
    }
  }

  async markAsSeen(dedupKey) {
    try {
      // Set with 5-minute expiry
      await this.redis.setEx(dedupKey, 300, Date.now().toString());
    } catch (error) {
      console.error('Failed to mark as seen:', error);
    }
  }

  async stop() {
    this.isRunning = false;
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.server) {
      this.server.close();
    }
    
    await this.consumer.disconnect();
    await this.redis.disconnect();
    console.log('Gateway stopped');
  }
}

module.exports = Gateway;