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

  // Simulate WebSocket/SSE connection for Kafka stream
  useEffect(() => {
    // Simulate connection establishment
    const connectTimer = setTimeout(() => {
      setIsConnected(true);
      setReels(mockReels);
      toast.success("Connected to Kafka stream!");
    }, 1000);

    // Simulate receiving new reels
    const streamTimer = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of new reel
        const newReel: ReelData = {
          id: `reel_${Date.now()}`,
          creator_id: `creator_${Math.floor(Math.random() * 100)}`,
          username: `user${Math.floor(Math.random() * 1000)}`,
          description: `New streaming content just dropped! #live #realtime #kafka`,
          thumbnail: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=400&h=600&fit=crop`,
          duration: Math.floor(Math.random() * 60) + 15,
          views: Math.floor(Math.random() * 10000),
          likes: Math.floor(Math.random() * 500),
          shares: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 100),
          isLive: Math.random() > 0.8,
          timestamp: "just now"
        };
        
        setReels(prev => [newReel, ...prev].slice(0, 10)); // Keep only 10 latest
        setMessagesReceived(prev => prev + 1);
        toast.info(`New reel from @${newReel.username}`, {
          duration: 2000,
        });
      }
    }, 3000);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(streamTimer);
    };
  }, []);

  const handleLike = useCallback((reelId: string) => {
    // Here you would send engagement event to Kafka
    console.log(`Engagement event: like for reel ${reelId}`);
    toast.success("Like sent!", { duration: 1000 });
  }, []);

  const handleShare = useCallback((reelId: string) => {
    // Here you would send engagement event to Kafka
    console.log(`Engagement event: share for reel ${reelId}`);
    toast.success("Shared!", { duration: 1000 });
  }, []);

  const handleView = useCallback((reelId: string) => {
    // Here you would send engagement event to Kafka
    console.log(`Engagement event: view for reel ${reelId}`);
  }, []);

  const handleVideoEnd = useCallback((reelId: string) => {
    // Send completion event to Kafka and award wallet bonus
    console.log(`Video completed: ${reelId}`);
    
    // Dispatch wallet bonus event
    window.dispatchEvent(new CustomEvent('walletBonus', {
      detail: { amount: 50, reelId }
    }));
    
    toast.success("Video completed! +50 coins earned 🎉", { duration: 3000 });
  }, []);

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