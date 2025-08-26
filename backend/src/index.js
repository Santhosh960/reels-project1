const ReelProducer = require('./services/producer');
const FeedAssembler = require('./services/feedAssembler');
const Gateway = require('./services/gateway');
const Counters = require('./services/counters');
const { createTopics } = require('../scripts/setupTopics');

class ReelsKafkaApp {
  constructor() {
    this.services = {
      producer: new ReelProducer(),
      feedAssembler: new FeedAssembler(),
      gateway: new Gateway(8000),
      counters: new Counters()
    };
    this.isRunning = false;
  }

  async start() {
    try {
      console.log('Starting Reels Kafka Application...');
      
      // Create topics first
      await createTopics();
      await this.sleep(2000); // Wait for topics to be ready
      
      // Connect all services
      await this.services.producer.connect();
      await this.services.feedAssembler.connect();
      await this.services.gateway.connect();
      await this.services.counters.connect();
      
      // Initialize mock data
      await this.services.feedAssembler.initializeMockFollowGraph();
      
      // Start services
      await this.services.gateway.start();
      
      // Start consumers (non-blocking)
      this.services.feedAssembler.start().catch(console.error);
      this.services.counters.start().catch(console.error);
      
      this.isRunning = true;
      console.log('✅ All services started successfully!');
      console.log('Gateway running on http://localhost:8000');
      console.log('WebSocket endpoint: ws://localhost:8000/ws/{userId}');
      
      // Start demo reel generation
      this.startDemoReelGeneration();
      
    } catch (error) {
      console.error('Failed to start application:', error);
      await this.stop();
      process.exit(1);
    }
  }

  async startDemoReelGeneration() {
    // Generate demo reels every 5 seconds
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const creatorIds = ['creator_001', 'creator_002', 'creator_003'];
        const creatorId = creatorIds[Math.floor(Math.random() * creatorIds.length)];
        const mockReel = this.services.producer.generateMockReel(creatorId);
        
        await this.services.producer.publishReel(mockReel);
        console.log(`Demo reel published by ${creatorId}`);
      } catch (error) {
        console.error('Error generating demo reel:', error);
      }
    }, 5000);
  }

  async stop() {
    console.log('Stopping Reels Kafka Application...');
    this.isRunning = false;
    
    try {
      await this.services.producer.disconnect();
      await this.services.feedAssembler.disconnect();
      await this.services.gateway.stop();
      await this.services.counters.stop();
      
      console.log('✅ All services stopped');
    } catch (error) {
      console.error('Error stopping services:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  if (global.app) {
    await global.app.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  if (global.app) {
    await global.app.stop();
  }
  process.exit(0);
});

// Start the application
if (require.main === module) {
  global.app = new ReelsKafkaApp();
  global.app.start().catch(console.error);
}

module.exports = ReelsKafkaApp;