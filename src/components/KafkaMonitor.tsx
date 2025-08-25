import { useState, useEffect } from "react";
import { Activity, Clock, Users, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KafkaMetrics {
  endToEndLatencyP50: number;
  endToEndLatencyP95: number;
  duplicateRate: number;
  reorderCount: number;
  messagesPerSecond: number;
  activeConsumers: number;
  topicPartitions: {
    reel_published: number;
    user_follow_graph: number;
    ranked_feed_updates: number;
    engagement_events: number;
  };
}

export const KafkaMonitor = () => {
  const [metrics, setMetrics] = useState<KafkaMetrics>({
    endToEndLatencyP50: 0,
    endToEndLatencyP95: 0,
    duplicateRate: 0,
    reorderCount: 0,
    messagesPerSecond: 0,
    activeConsumers: 0,
    topicPartitions: {
      reel_published: 12,
      user_follow_graph: 6,
      ranked_feed_updates: 24,
      engagement_events: 12
    }
  });

  const [isHealthy, setIsHealthy] = useState(true);

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        endToEndLatencyP50: Math.floor(Math.random() * 150) + 50,
        endToEndLatencyP95: Math.floor(Math.random() * 300) + 200,
        duplicateRate: Math.random() * 0.08,
        reorderCount: Math.floor(Math.random() * 3),
        messagesPerSecond: Math.floor(Math.random() * 300) + 100,
        activeConsumers: Math.floor(Math.random() * 3) + 2
      }));

      // Update health status based on SLOs
      setIsHealthy(prev => {
        const newHealth = metrics.endToEndLatencyP95 < 500 && 
                         metrics.duplicateRate < 0.1 && 
                         metrics.reorderCount === 0;
        return newHealth;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [metrics.endToEndLatencyP95, metrics.duplicateRate, metrics.reorderCount]);

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return "text-green-400";
    if (latency < 300) return "text-yellow-400";
    return "text-red-400";
  };

  const getSLOStatus = () => {
    const p95OK = metrics.endToEndLatencyP95 < 500;
    const dupOK = metrics.duplicateRate < 0.1;
    const orderOK = metrics.reorderCount === 0;
    
    return { p95OK, dupOK, orderOK, allOK: p95OK && dupOK && orderOK };
  };

  const sloStatus = getSLOStatus();

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
          Kafka Stream Monitor
        </h2>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          isHealthy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isHealthy ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">
            {isHealthy ? 'All SLOs Met' : 'SLO Violation'}
          </span>
        </div>
      </div>

      {/* SLO Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              P95 Latency SLO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getLatencyColor(metrics.endToEndLatencyP95)}>
                {metrics.endToEndLatencyP95}ms
              </span>
            </div>
            <p className={`text-sm ${sloStatus.p95OK ? 'text-green-400' : 'text-red-400'}`}>
              Target: ≤ 500ms {sloStatus.p95OK ? '✓' : '✗'}
            </p>
          </CardContent>
        </Card>

        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              Duplicate Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={sloStatus.dupOK ? 'text-green-400' : 'text-red-400'}>
                {(metrics.duplicateRate * 100).toFixed(2)}%
              </span>
            </div>
            <p className={`text-sm ${sloStatus.dupOK ? 'text-green-400' : 'text-red-400'}`}>
              Target: ≤ 0.1% {sloStatus.dupOK ? '✓' : '✗'}
            </p>
          </CardContent>
        </Card>

        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              Reorder Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={sloStatus.orderOK ? 'text-green-400' : 'text-red-400'}>
                {metrics.reorderCount}
              </span>
            </div>
            <p className={`text-sm ${sloStatus.orderOK ? 'text-green-400' : 'text-red-400'}`}>
              Target: 0 {sloStatus.orderOK ? '✓' : '✗'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metrics.messagesPerSecond}
            </div>
            <p className="text-sm text-muted-foreground">msg/sec</p>
          </CardContent>
        </Card>

        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" />
              P50 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metrics.endToEndLatencyP50}ms
            </div>
            <p className="text-sm text-muted-foreground">median</p>
          </CardContent>
        </Card>

        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              Active Consumers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metrics.activeConsumers}
            </div>
            <p className="text-sm text-muted-foreground">instances</p>
          </CardContent>
        </Card>

        <Card className="reel-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4" />
              Total Partitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Object.values(metrics.topicPartitions).reduce((a, b) => a + b, 0)}
            </div>
            <p className="text-sm text-muted-foreground">across all topics</p>
          </CardContent>
        </Card>
      </div>

      {/* Topic Breakdown */}
      <Card className="reel-card">
        <CardHeader>
          <CardTitle>Kafka Topics Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(metrics.topicPartitions).map(([topic, partitions]) => (
              <div key={topic} className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="font-semibold text-primary">{partitions}</div>
                <div className="text-sm text-muted-foreground">{topic}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};