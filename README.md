
# Reels Kafka Mini Project - Santhosh

A real-time streaming reels application built with React.js frontend and Node.js backend using Apache Kafka for message streaming.

## Architecture

- **Frontend**: React.js with TypeScript, Tailwind CSS
- **Backend**: Node.js with KafkaJS, Express, WebSocket
- **Streaming**: Apache Kafka (3-broker cluster)
- **Cache**: Redis for deduplication
- **Container**: Docker with Docker Compose

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### One-Command Setup
```bash
docker-compose up -d
```

### Services & Ports
- **Frontend**: http://localhost:3000
- **Backend Gateway**: http://localhost:8000
- **Kafka UI**: http://localhost:8080
- **Kafka Brokers**: localhost:9092, localhost:9093, localhost:9094
- **Redis**: localhost:6379

## Load Testing

### Baseline Test (1 msg/s for 1 minute)
```bash
cd backend && npm run load-test baseline
```

### Burst Test (200 msg/s for 5 minutes)
```bash
cd backend && npm run load-test burst
```

## Features

- ✅ Per-creator ordering preservation
- ✅ Duplicate elimination (Redis-based deduplication)
- ✅ Real-time WebSocket streaming
- ✅ Engagement tracking (views, likes, shares)
- ✅ Wallet bonus system (+50 coins per video completion)
- ✅ High availability (3-broker Kafka cluster)
- ✅ Observability (correlation IDs, latency tracking)

## Performance Targets

- **p95 latency**: ≤ 500ms end-to-end
- **Duplicate rate**: ≤ 0.1%
- **Per-creator ordering**: 0 reorder events
- **Load capacity**: 200+ msg/s sustained
