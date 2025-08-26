const { createConsumer, createProducer, TOPICS, addHeaders } = require('../config/kafka');

class FeedAssembler {
  constructor() {
    this.consumer = createConsumer('feed-assembler-group');
    this.producer = createProducer();
    this.followGraph = new Map(); // In-memory follow graph cache
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      await this.producer.connect();
      
      // Subscribe to topics
      await this.consumer.subscribe({ 
        topics: [TOPICS.REEL_PUBLISHED, TOPICS.USER_FOLLOW_GRAPH],
        fromBeginning: false 
      });

      console.log('Feed Assembler connected to Kafka');
    } catch (error) {
      console.error('Feed Assembler connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    this.isRunning = false;
    await this.consumer.disconnect();
    await this.producer.disconnect();
    console.log('Feed Assembler disconnected');
  }

  async start() {
    this.isRunning = true;
    
    await this.consumer.run({
      autoCommit: false, // Manual commit for better control
      partitionsConsumedConcurrently: 3,
      eachMessage: async ({ topic, partition, message, heartbeat }) => {
        try {
          await heartbeat();
          
          if (topic === TOPICS.USER_FOLLOW_GRAPH) {
            await this.handleFollowGraphUpdate(message);
          } else if (topic === TOPICS.REEL_PUBLISHED) {
            await this.handleNewReel(message);
          }

          // Commit after successful processing
          await this.consumer.commitOffsets([{
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString()
          }]);

        } catch (error) {
          console.error(`Error processing message from ${topic}:`, error);
          // Don't commit on error - message will be reprocessed
        }
      }
    });
  }

  async handleFollowGraphUpdate(message) {
    const followData = JSON.parse(message.value.toString());
    
    // Update follow graph cache
    if (followData.action === 'follow') {
      if (!this.followGraph.has(followData.creator_id)) {
        this.followGraph.set(followData.creator_id, new Set());
      }
      this.followGraph.get(followData.creator_id).add(followData.user_id);
    } else if (followData.action === 'unfollow') {
      if (this.followGraph.has(followData.creator_id)) {
        this.followGraph.get(followData.creator_id).delete(followData.user_id);
      }
    }

    console.log(`Follow graph updated: ${followData.action} ${followData.user_id} -> ${followData.creator_id}`);
  }

  async handleNewReel(message) {
    const reelData = JSON.parse(message.value.toString());
    const correlationId = message.headers['x-corr-id']?.toString();
    const publishTs = message.headers['x-publish-ts']?.toString();

    console.log(`Processing new reel: ${reelData.id} from creator ${reelData.creator_id}`);

    // Get followers for this creator
    const followers = this.followGraph.get(reelData.creator_id) || new Set();
    
    // Add some mock followers if none exist (for demo)
    if (followers.size === 0) {
      ['user_1', 'user_2', 'user_3'].forEach(userId => followers.add(userId));
    }

    // Fan out to each follower's feed
    const fanOutMessages = [];
    
    for (const userId of followers) {
      const feedUpdate = {
        user_id: userId,
        reel_id: reelData.id,
        creator_id: reelData.creator_id,
        reel_data: reelData,
        timestamp: Date.now(),
        rank_score: this.calculateRankScore(reelData, userId)
      };

      fanOutMessages.push({
        key: userId, // Partition by user_id
        value: JSON.stringify(feedUpdate),
        headers: {
          'x-corr-id': correlationId,
          'x-publish-ts': publishTs,
          'x-fanout-ts': Date.now().toString()
        }
      });
    }

    // Send fan-out messages to ranked feed updates topic
    if (fanOutMessages.length > 0) {
      try {
        await this.producer.send({
          topic: TOPICS.RANKED_FEED_UPDATES,
          messages: fanOutMessages,
          acks: -1
        });

        console.log(`Fan-out completed: ${fanOutMessages.length} users for reel ${reelData.id}`);
      } catch (error) {
        console.error('Fan-out failed:', error);
        throw error;
      }
    }
  }

  calculateRankScore(reelData, userId) {
    // Simple ranking algorithm - can be enhanced with ML models
    let score = 100;
    
    // Boost live content
    if (reelData.isLive) score += 50;
    
    // Boost recent content
    const ageMinutes = (Date.now() - reelData.timestamp) / (1000 * 60);
    score -= ageMinutes * 0.5;
    
    // Boost engaging content
    score += (reelData.likes || 0) * 0.01;
    score += (reelData.views || 0) * 0.001;
    
    return Math.max(0, score);
  }

  // Initialize with some mock follow relationships
  async initializeMockFollowGraph() {
    const mockFollows = [
      { creator_id: 'creator_001', user_id: 'user_1' },
      { creator_id: 'creator_001', user_id: 'user_2' },
      { creator_id: 'creator_002', user_id: 'user_1' },
      { creator_id: 'creator_002', user_id: 'user_3' },
      { creator_id: 'creator_003', user_id: 'user_2' },
      { creator_id: 'creator_003', user_id: 'user_3' }
    ];

    for (const follow of mockFollows) {
      if (!this.followGraph.has(follow.creator_id)) {
        this.followGraph.set(follow.creator_id, new Set());
      }
      this.followGraph.get(follow.creator_id).add(follow.user_id);
    }

    console.log('Mock follow graph initialized');
  }
}

module.exports = FeedAssembler;