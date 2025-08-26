import { useState, useEffect } from "react";
import { Wallet, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletDisplayProps {
  className?: string;
}

export const WalletDisplay = ({ className }: WalletDisplayProps) => {
  const [balance, setBalance] = useState(1250);
  const [showEarning, setShowEarning] = useState(false);
  const [lastEarning, setLastEarning] = useState(0);

  const addBonus = (amount: number) => {
    setBalance(prev => prev + amount);
    setLastEarning(amount);
    setShowEarning(true);
    setTimeout(() => setShowEarning(false), 2000);
  };

  // Listen for wallet bonus events
  useEffect(() => {
    const handleWalletBonus = (event: CustomEvent) => {
      addBonus(event.detail.amount);
    };

    window.addEventListener('walletBonus', handleWalletBonus as EventListener);
    return () => window.removeEventListener('walletBonus', handleWalletBonus as EventListener);
  }, []);

  return (
    <div className={cn("flex items-center gap-2 text-foreground", className)}>
      <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 py-1.5">
        <Wallet className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{balance.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">coins</span>
      </div>
      
      {showEarning && (
        <div className="flex items-center gap-1 text-primary animate-in slide-in-from-left-2 fade-in-0">
          <Plus className="w-3 h-3" />
          <span className="text-sm font-semibold">+{lastEarning}</span>
        </div>
      )}
    </div>
  );
};