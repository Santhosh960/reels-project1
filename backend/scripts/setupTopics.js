const { kafka, TOPICS, PARTITIONS } = require('../src/config/kafka');

async function createTopics() {
  const admin = kafka.admin();
  
  try {
    await admin.connect();
    console.log('Connected to Kafka admin');

    const topics = [
      {
        topic: TOPICS.REEL_PUBLISHED,
        numPartitions: PARTITIONS.REEL_PUBLISHED,
        replicationFactor: 3,
        configEntries: [
          { name: 'min.insync.replicas', value: '2' },
          { name: 'retention.ms', value: '604800000' } // 7 days
        ]
      },
      {
        topic: TOPICS.USER_FOLLOW_GRAPH,
        numPartitions: PARTITIONS.USER_FOLLOW_GRAPH,
        replicationFactor: 3,
        configEntries: [
          { name: 'cleanup.policy', value: 'compact' },
          { name: 'min.insync.replicas', value: '2' }
        ]
      },
      {
        topic: TOPICS.RANKED_FEED_UPDATES,
        numPartitions: PARTITIONS.RANKED_FEED_UPDATES,
        replicationFactor: 3,
        configEntries: [
          { name: 'min.insync.replicas', value: '2' },
          { name: 'retention.ms', value: '86400000' } // 1 day
        ]
      },
      {
        topic: TOPICS.ENGAGEMENT_EVENTS,
        numPartitions: PARTITIONS.ENGAGEMENT_EVENTS,
        replicationFactor: 3,
        configEntries: [
          { name: 'min.insync.replicas', value: '2' },
          { name: 'retention.ms', value: '2592000000' } // 30 days
        ]
      }
    ];

    // Check existing topics
    const existingTopics = await admin.listTopics();
    const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic.topic));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true,
        timeout: 30000
      });

      console.log('Topics created successfully:');
      topicsToCreate.forEach(topic => {
        console.log(`  ${topic.topic}: ${topic.numPartitions} partitions, RF=${topic.replicationFactor}`);
      });
    } else {
      console.log('All topics already exist');
    }

    // List all topics for verification
    const allTopics = await admin.listTopics();
    console.log('All topics:', allTopics);

  } catch (error) {
    console.error('Error creating topics:', error);
  } finally {
    await admin.disconnect();
  }
}

if (require.main === module) {
  createTopics().catch(console.error);
}

module.exports = { createTopics };