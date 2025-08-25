import { Heart, Share2, Eye, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ReelData {
  id: string;
  creator_id: string;
  username: string;
  description: string;
  thumbnail: string;
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
}

export const ReelCard = ({ reel, onLike, onShare, onView }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
    onLike?.(reel.id);
  };

  const handleShare = () => {
    onShare?.(reel.id);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="reel-card aspect-[9/16] max-w-sm w-full mx-auto relative group">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center rounded-2xl"
        style={{ backgroundImage: `url(${reel.thumbnail})` }}
      >
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 rounded-2xl" />
      </div>

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
    </div>
  );
};