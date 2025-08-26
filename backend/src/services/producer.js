const { createProducer, TOPICS, addHeaders, createCorrelationId } = require('../config/kafka');
const { v4: uuidv4 } = require('uuid');

class ReelProducer {
  constructor() {
    this.producer = createProducer();
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Producer connected to Kafka');
    } catch (error) {
      console.error('Producer connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Producer disconnected');
    }
  }

  async publishReel(reelData) {
    if (!this.isConnected) {
      throw new Error('Producer not connected');
    }

    const correlationId = createCorrelationId();
    const publishTimestamp = Date.now();

    const message = {
      key: reelData.creator_id, // Partition by creator_id to preserve ordering
      value: JSON.stringify({
        ...reelData,
        id: reelData.id || uuidv4(),
        timestamp: publishTimestamp
      }),
      headers: addHeaders(correlationId)
    };

    try {
      const result = await this.producer.send({
        topic: TOPICS.REEL_PUBLISHED,
        messages: [message],
        acks: -1, // Wait for all replicas
        timeout: 30000
      });

      console.log(`Reel published: ${reelData.id} by ${reelData.creator_id}`, {
        correlationId,
        partition: result[0].partition,
        offset: result[0].offset
      });

      return {
        success: true,
        correlationId,
        publishTimestamp,
        partition: result[0].partition,
        offset: result[0].offset
      };
    } catch (error) {
      console.error('Failed to publish reel:', error);
      throw error;
    }
  }

  async publishEngagementEvent(eventData) {
    if (!this.isConnected) {
      throw new Error('Producer not connected');
    }

    const correlationId = createCorrelationId();
    
    const message = {
      key: eventData.reel_id, // Key by reel_id for engagement events
      value: JSON.stringify({
        ...eventData,
        timestamp: Date.now()
      }),
      headers: addHeaders(correlationId)
    };

    try {
      const result = await this.producer.send({
        topic: TOPICS.ENGAGEMENT_EVENTS,
        messages: [message],
        acks: -1
      });

      console.log(`Engagement event published: ${eventData.type} for reel ${eventData.reel_id}`);
      return result;
    } catch (error) {
      console.error('Failed to publish engagement event:', error);
      throw error;
    }
  }

  // Generate mock reels for testing
  generateMockReel(creatorId) {
    const reelTypes = [
      'Tech Tutorial: Building Kafka streams in React! 🚀',
      'Live coding session: Real-time data processing ⚡',
      'Behind the scenes: Scaling with Kafka clusters 🔧',
      'Quick tip: Optimizing consumer lag 💡',
      'Architecture deep dive: Event-driven systems 🏗️'
    ];

    return {
      id: uuidv4(),
      creator_id: creatorId,
      username: `creator_${creatorId}`,
      description: reelTypes[Math.floor(Math.random() * reelTypes.length)],
      thumbnail: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=400&h=600&fit=crop`,
      videoUrl: `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_${Math.floor(Math.random() * 3) + 1}mb.mp4`,
      duration: Math.floor(Math.random() * 60) + 15,
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 500),
      shares: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 100),
      isLive: Math.random() > 0.8
    };
  }
}

module.exports = ReelProducer;