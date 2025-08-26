import { useState, useEffect, useCallback } from "react";
import { ReelCard } from "./ReelCard";
import { StreamingIndicator } from "./StreamingIndicator";
import { WalletDisplay } from "./WalletDisplay";
import { toast } from "sonner";

interface ReelData {
  id: string;
  creator_id: string;
  username: string;
  description: string;
  thumbnail: string;
  videoUrl?: string;
  duration: number;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  isLive?: boolean;
  timestamp: string;
}

export const ReelFeed = () => {
  const [reels, setReels] = useState<ReelData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [messagesReceived, setMessagesReceived] = useState(0);

  // Mock reels data for demonstration
  const mockReels: ReelData[] = [
    {
      id: "reel_1",
      creator_id: "creator_001",
      username: "techcreator",
      description: "Building amazing Kafka streaming apps! 🚀 #kafka #realtime #streaming",
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      duration: 30,
      views: 15420,
      likes: 892,
      shares: 45,
      comments: 123,
      isLive: true,
      timestamp: "2 min ago"
    },
    {
      id: "reel_2",
      creator_id: "creator_002", 
      username: "designpro",
      description: "React + Kafka = ❤️ Real-time magic happening here!",
      thumbnail: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=600&fit=crop",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
      duration: 45,
      views: 8930,
      likes: 567,
      shares: 23,
      comments: 89,
      timestamp: "5 min ago"
    },
    {
      id: "reel_3",
      creator_id: "creator_003",
      username: "streamingdev",
      description: "Zero duplicates, perfect ordering ✨ That's how we roll with Kafka!",
      thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=600&fit=crop",
      duration: 60,
      views: 12100,
      likes: 1230,
      shares: 67,
      comments: 201,
      isLive: true,
      timestamp: "8 min ago"
    }
  ];

  // Real WebSocket connection to Kafka Gateway
  useEffect(() => {
    const userId = 'user_1'; // In real app, get from auth
    const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      // Set initial mock reels
      setReels(mockReels);
      toast.success("Connected to Kafka stream!");
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'new_reel') {
          const newReel = message.data;
          setReels(prev => [newReel, ...prev].slice(0, 10)); // Keep only 10 latest
          setMessagesReceived(prev => prev + 1);
          toast.info(`New reel from @${newReel.username}`, {
            duration: 2000,
          });
        } else if (message.type === 'engagement_update') {
          // Handle real-time engagement updates
          const { reel_id, type, count } = message.data;
          setReels(prev => prev.map(reel => 
            reel.id === reel_id 
              ? { ...reel, [type]: count }
              : reel
          ));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      toast.error("Disconnected from Kafka stream");
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      toast.error("Connection error");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const sendEngagementEvent = useCallback((type: string, reelId: string) => {
    // Send engagement event through WebSocket to Kafka
    const userId = 'user_1'; // In real app, get from auth
    const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type,
        reel_id: reelId,
        timestamp: Date.now()
      }));
      ws.close();
    };
  }, []);

  const handleLike = useCallback((reelId: string) => {
    sendEngagementEvent('like', reelId);
    toast.success("Like sent!", { duration: 1000 });
  }, [sendEngagementEvent]);

  const handleShare = useCallback((reelId: string) => {
    sendEngagementEvent('share', reelId);
    toast.success("Shared!", { duration: 1000 });
  }, [sendEngagementEvent]);

  const handleView = useCallback((reelId: string) => {
    sendEngagementEvent('view', reelId);
  }, [sendEngagementEvent]);

  const handleVideoEnd = useCallback((reelId: string) => {
    // Send completion event to Kafka and award wallet bonus
    sendEngagementEvent('completion', reelId);
    
    // Dispatch wallet bonus event
    window.dispatchEvent(new CustomEvent('walletBonus', {
      detail: { amount: 50, reelId }
    }));
    
    toast.success("Video completed! +50 coins earned 🎉", { duration: 3000 });
  }, [sendEngagementEvent]);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            Reels Stream
          </h1>
          <div className="flex items-center gap-4">
            <WalletDisplay />
            <StreamingIndicator 
              isConnected={isConnected}
              messagesReceived={messagesReceived}
            />
          </div>
        </div>
      </div>

      {/* Feed Container */}
      <div className="container mx-auto px-4 py-6">
        {!isConnected ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Connecting to Kafka stream...</p>
            </div>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">Waiting for reels...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 max-w-md mx-auto">
            {reels.map((reel) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                onLike={handleLike}
                onShare={handleShare}
                onView={handleView}
                onVideoEnd={handleVideoEnd}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};