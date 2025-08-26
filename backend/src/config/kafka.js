const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

const kafka = new Kafka({
  clientId: 'reels-app',
  brokers: [
    'localhost:9092',
    'localhost:9093', 
    'localhost:9094'
  ],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Topic configurations
const TOPICS = {
  REEL_PUBLISHED: 'reel_published',
  USER_FOLLOW_GRAPH: 'user_follow_graph', 
  RANKED_FEED_UPDATES: 'ranked_feed_updates',
  ENGAGEMENT_EVENTS: 'engagement_events'
};

const PARTITIONS = {
  REEL_PUBLISHED: 12,
  USER_FOLLOW_GRAPH: 6,
  RANKED_FEED_UPDATES: 24,
  ENGAGEMENT_EVENTS: 12
};

// Producer configuration
const createProducer = () => kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 5,
  transactionTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
});

// Consumer configuration  
const createConsumer = (groupId) => kafka.consumer({
  groupId,
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  heartbeatInterval: 3000,
  partitionAssignors: ['CooperativeSticky'],
  allowAutoTopicCreation: false,
  maxWaitTimeInMs: 50,
  minBytes: 1024,
  maxBytes: 5242880,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create correlation ID
const createCorrelationId = () => uuidv4();

// Add headers with correlation ID and timestamp
const addHeaders = (correlationId) => ({
  'x-corr-id': correlationId || createCorrelationId(),
  'x-publish-ts': Date.now().toString()
});

module.exports = {
  kafka,
  TOPICS,
  PARTITIONS,
  createProducer,
  createConsumer,
  createCorrelationId,
  addHeaders
};