const { createConsumer, TOPICS } = require('../config/kafka');

class Counters {
  constructor() {
    this.consumer = createConsumer('counters-group');
    this.reelStats = new Map(); // reel_id -> stats
    this.userStats = new Map(); // user_id -> stats
    this.processedEvents = new Set(); // For idempotent processing
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ 
        topics: [TOPICS.ENGAGEMENT_EVENTS],
        fromBeginning: false 
      });
      console.log('Counters service connected to Kafka');
    } catch (error) {
      console.error('Counters connection failed:', error);
      throw error;
    }
  }

  async start() {
    this.isRunning = true;
    
    await this.consumer.run({
      autoCommit: false,
      partitionsConsumedConcurrently: 3,
      eachMessage: async ({ topic, partition, message, heartbeat }) => {
        try {
          await heartbeat();
          await this.processEngagementEvent(message);

          // Commit after successful processing
          await this.consumer.commitOffsets([{
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString()
          }]);

        } catch (error) {
          console.error('Error processing engagement event:', error);
          // Don't commit on error - message will be reprocessed
        }
      }
    });
  }

  async processEngagementEvent(message) {
    const eventData = JSON.parse(message.value.toString());
    const correlationId = message.headers['x-corr-id']?.toString();
    
    // Idempotent processing - check if already processed
    const eventKey = `${correlationId}_${message.offset}`;
    if (this.processedEvents.has(eventKey)) {
      console.log(`Event already processed: ${eventKey}`);
      return;
    }

    const { reel_id, user_id, type, timestamp } = eventData;

    // Update reel statistics
    if (!this.reelStats.has(reel_id)) {
      this.reelStats.set(reel_id, {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        completions: 0,
        lastUpdated: timestamp
      });
    }

    const reelStats = this.reelStats.get(reel_id);

    // Update user statistics
    if (!this.userStats.has(user_id)) {
      this.userStats.set(user_id, {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0,
        totalCompletions: 0,
        coinsEarned: 0,
        lastActive: timestamp
      });
    }

    const userStats = this.userStats.get(user_id);

    // Process different event types
    switch (type) {
      case 'view':
        reelStats.views++;
        userStats.totalViews++;
        break;
        
      case 'like':
        reelStats.likes++;
        userStats.totalLikes++;
        break;
        
      case 'share':
        reelStats.shares++;
        userStats.totalShares++;
        break;
        
      case 'comment':
        reelStats.comments++;
        userStats.totalComments++;
        break;
        
      case 'completion':
        reelStats.completions++;
        userStats.totalCompletions++;
        userStats.coinsEarned += 50; // Bonus for completion
        break;
        
      default:
        console.warn(`Unknown engagement event type: ${type}`);
    }

    reelStats.lastUpdated = timestamp;
    userStats.lastActive = timestamp;

    // Mark as processed
    this.processedEvents.add(eventKey);
    
    // Clean up old processed events (keep last 10000)
    if (this.processedEvents.size > 10000) {
      const oldestEvents = Array.from(this.processedEvents).slice(0, 1000);
      oldestEvents.forEach(event => this.processedEvents.delete(event));
    }

    console.log(`Processed ${type} event for reel ${reel_id} by user ${user_id}`);
    
    // Log stats periodically
    if (Math.random() < 0.1) { // 10% chance
      this.logStats();
    }
  }

  logStats() {
    const totalReels = this.reelStats.size;
    const totalUsers = this.userStats.size;
    const totalViews = Array.from(this.reelStats.values()).reduce((sum, stats) => sum + stats.views, 0);
    const totalLikes = Array.from(this.reelStats.values()).reduce((sum, stats) => sum + stats.likes, 0);
    const totalCoins = Array.from(this.userStats.values()).reduce((sum, stats) => sum + stats.coinsEarned, 0);

    console.log('=== COUNTERS STATS ===');
    console.log(`Total Reels: ${totalReels}`);
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Views: ${totalViews}`);
    console.log(`Total Likes: ${totalLikes}`);
    console.log(`Total Coins Earned: ${totalCoins}`);
    console.log('====================');
  }

  getReelStats(reelId) {
    return this.reelStats.get(reelId) || null;
  }

  getUserStats(userId) {
    return this.userStats.get(userId) || null;
  }

  getAllStats() {
    return {
      reelStats: Object.fromEntries(this.reelStats),
      userStats: Object.fromEntries(this.userStats),
      summary: {
        totalReels: this.reelStats.size,
        totalUsers: this.userStats.size,
        totalViews: Array.from(this.reelStats.values()).reduce((sum, stats) => sum + stats.views, 0),
        totalLikes: Array.from(this.reelStats.values()).reduce((sum, stats) => sum + stats.likes, 0),
        totalCoins: Array.from(this.userStats.values()).reduce((sum, stats) => sum + stats.coinsEarned, 0)
      }
    };
  }

  async stop() {
    this.isRunning = false;
    await this.consumer.disconnect();
    console.log('Counters service stopped');
  }
}

module.exports = Counters;
