import { Heart, Share2, Eye, MessageCircle, Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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

interface ReelCardProps {
  reel: ReelData;
  onLike?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onView?: (reelId: string) => void;
  onVideoEnd?: (reelId: string) => void;
}

export const ReelCard = ({ reel, onLike, onShare, onView, onVideoEnd }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
    onLike?.(reel.id);
  };

  const handleShare = () => {
    onShare?.(reel.id);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setShowBonus(true);
    onVideoEnd?.(reel.id);
    setTimeout(() => setShowBonus(false), 3000);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('ended', handleVideoEnd);
      return () => video.removeEventListener('ended', handleVideoEnd);
    }
  }, []);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="reel-card aspect-[9/16] max-w-sm w-full mx-auto relative group">
      {/* Video Player */}
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          poster={reel.thumbnail}
          loop
          muted
          playsInline
        >
          <source src={reel.videoUrl} type="video/mp4" />
        </video>
      ) : (
        <div 
          className="absolute inset-0 bg-cover bg-center rounded-2xl"
          style={{ backgroundImage: `url(${reel.thumbnail})` }}
        />
      )}
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 rounded-2xl" />
      
      {/* Play/Pause Button */}
      {reel.videoUrl && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          {isPlaying ? (
            <Pause className="w-16 h-16 text-white drop-shadow-lg" />
          ) : (
            <Play className="w-16 h-16 text-white drop-shadow-lg" />
          )}
        </button>
      )}

      {/* Live Indicator */}
      {reel.isLive && (
        <div className="absolute top-4 left-4">
          <div className="live-indicator">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
      )}

      {/* Creator Info */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="text-right">
          <p className="text-white text-sm font-semibold">@{reel.username}</p>
          <p className="text-white/70 text-xs">{reel.timestamp}</p>
        </div>
        <div className="w-10 h-10 rounded-full gradient-primary p-[2px]">
          <div className="w-full h-full rounded-full bg-gray-700" />
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between">
          {/* Description */}
          <div className="flex-1 pr-4">
            <p className="text-white text-sm mb-2 line-clamp-2">
              {reel.description}
            </p>
          </div>

          {/* Engagement Sidebar */}
          <div className="flex flex-col gap-3">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={cn(
                "engagement-button",
                isLiked && "text-like bg-like/20"
              )}
            >
              <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
            </button>
            <span className="text-white text-xs text-center">
              {formatCount(localLikes)}
            </span>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="engagement-button text-share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <span className="text-white text-xs text-center">
              {formatCount(reel.shares)}
            </span>

            {/* Comments Button */}
            <button className="engagement-button">
              <MessageCircle className="w-5 h-5" />
            </button>
            <span className="text-white text-xs text-center">
              {formatCount(reel.comments)}
            </span>

            {/* Views */}
            <div className="engagement-button cursor-default">
              <Eye className="w-5 h-5 text-views" />
            </div>
            <span className="text-white text-xs text-center">
              {formatCount(reel.views)}
            </span>
          </div>
        </div>
      </div>

      {/* Streaming Glow Effect */}
      {reel.isLive && (
        <div className="absolute inset-0 streaming-glow rounded-2xl opacity-50" />
      )}
      
      {/* Wallet Bonus Popup */}
      {showBonus && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="bg-card border border-border rounded-lg p-6 text-center shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Bonus Earned!</h3>
            <p className="text-sm text-muted-foreground mb-3">+50 coins for watching</p>
            <div className="text-2xl font-bold text-primary animate-pulse">+50 💰</div>
          </div>
        </div>
      )}
    </div>
  );
};