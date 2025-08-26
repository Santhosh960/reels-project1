const ReelProducer = require('../src/services/producer');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class LoadTester {
  constructor() {
    this.producer = new ReelProducer();
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runTest(messagesPerSecond = 200, durationMinutes = 5) {
    console.log(`Starting load test: ${messagesPerSecond} msg/s for ${durationMinutes} minutes`);
    
    await this.producer.connect();
    
    this.startTime = performance.now();
    const durationMs = durationMinutes * 60 * 1000;
    const intervalMs = 1000 / messagesPerSecond;
    const totalMessages = messagesPerSecond * durationMinutes * 60;
    
    let messagesSent = 0;
    let errors = 0;
    const latencies = [];
    
    const creatorIds = ['creator_001', 'creator_002', 'creator_003', 'creator_004', 'creator_005'];
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const now = performance.now();
        
        if (now - this.startTime >= durationMs || messagesSent >= totalMessages) {
          clearInterval(interval);
          this.endTime = performance.now();
          await this.producer.disconnect();
          
          const summary = this.calculateSummary(latencies, errors, messagesSent);
          await this.saveResults(summary);
          resolve(summary);
          return;
        }

        // Send message
        try {
          const creatorId = creatorIds[Math.floor(Math.random() * creatorIds.length)];
          const mockReel = this.producer.generateMockReel(creatorId);
          
          const sendStart = performance.now();
          await this.producer.publishReel(mockReel);
          const sendEnd = performance.now();
          
          const latency = sendEnd - sendStart;
          latencies.push(latency);
          messagesSent++;
          
          if (messagesSent % 100 === 0) {
            console.log(`Sent ${messagesSent}/${totalMessages} messages`);
          }
          
        } catch (error) {
          errors++;
          console.error('Send error:', error.message);
        }
      }, intervalMs);
    });
  }

  calculateSummary(latencies, errors, messagesSent) {
    latencies.sort((a, b) => a - b);
    
    const p50 = this.percentile(latencies, 0.5);
    const p95 = this.percentile(latencies, 0.95);
    const p99 = this.percentile(latencies, 0.99);
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    
    const duration = (this.endTime - this.startTime) / 1000; // seconds
    const throughput = messagesSent / duration;
    
    return {
      messagesSent,
      errors,
      duration,
      throughput,
      latencies: {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg,
        p50,
        p95,
        p99
      },
      errorRate: (errors / (messagesSent + errors)) * 100
    };
  }

  percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index];
  }

  async saveResults(summary) {
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(resultsDir, `load-test-${timestamp}.json`);
    
    fs.writeFileSync(filename, JSON.stringify(summary, null, 2));
    console.log(`Results saved to ${filename}`);
    
    // Also create CSV for easier analysis
    const csvContent = [
      'metric,value',
      `messages_sent,${summary.messagesSent}`,
      `errors,${summary.errors}`,
      `duration_seconds,${summary.duration}`,
      `throughput_msg_per_sec,${summary.throughput}`,
      `latency_min_ms,${summary.latencies.min}`,
      `latency_avg_ms,${summary.latencies.avg}`,
      `latency_p50_ms,${summary.latencies.p50}`,
      `latency_p95_ms,${summary.latencies.p95}`,
      `latency_p99_ms,${summary.latencies.p99}`,
      `latency_max_ms,${summary.latencies.max}`,
      `error_rate_percent,${summary.errorRate}`
    ].join('\n');
    
    const csvFilename = path.join(resultsDir, `load-test-${timestamp}.csv`);
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`CSV results saved to ${csvFilename}`);
  }

  async runBurstTest() {
    console.log('Running burst test (200 msg/s for 5 minutes)...');
    return await this.runTest(200, 5);
  }

  async runBaselineTest() {
    console.log('Running baseline test (1 msg/s for 1 minute)...');
    return await this.runTest(1, 1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const tester = new LoadTester();
  
  if (args[0] === 'burst') {
    tester.runBurstTest().then(console.log).catch(console.error);
  } else if (args[0] === 'baseline') {
    tester.runBaselineTest().then(console.log).catch(console.error);
  } else {
    const messagesPerSecond = parseInt(args[0]) || 200;
    const durationMinutes = parseInt(args[1]) || 5;
    tester.runTest(messagesPerSecond, durationMinutes).then(console.log).catch(console.error);
  }
}

module.exports = LoadTester;