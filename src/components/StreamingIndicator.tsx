import { Activity, Wifi, WifiOff, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamingIndicatorProps {
  isConnected: boolean;
  messagesReceived?: number;
  latency?: number;
}

export const StreamingIndicator = ({ 
  isConnected, 
  messagesReceived = 0, 
  latency 
}: StreamingIndicatorProps) => {
  return (
    <div className="flex items-center gap-4">
      {/* Connection Status */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all",
        isConnected 
          ? "bg-green-500/20 text-green-400 border border-green-500/30" 
          : "bg-red-500/20 text-red-400 border border-red-500/30"
      )}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Disconnected</span>
          </>
        )}
        {isConnected && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </div>

      {/* Message Counter */}
      {isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/20 text-primary border border-primary/30">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">{messagesReceived}</span>
        </div>
      )}

      {/* Latency Indicator */}
      {latency && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium",
          latency < 100 
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : latency < 300
            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"  
            : "bg-red-500/20 text-red-400 border border-red-500/30"
        )}>
          <Zap className="w-4 h-4" />
          <span>{latency}ms</span>
        </div>
      )}
    </div>
  );
};