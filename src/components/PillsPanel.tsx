import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PILL_CONFIGS } from '@/data/pills';
import type { PillType } from '@/types/pill';
import { FlaskConical, Lock, Sparkles, Clock, Coins } from 'lucide-react';

export const PillsPanel: React.FC = () => {
  const { pillInventory, spiritStones, herbInventory } = useGameStore();
  
  const getPillQuantity = (type: PillType): number => {
    const pill = pillInventory.find(p => p.type === type);
    return pill?.quantity || 0;
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gold-gradient">丹药宝库</h1>
        <p className="text-sect-jade/60 text-sm mt-1">
          炼制与管理丹药，辅助弟子修炼突破
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <FlaskConical className="text-sect-pill" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">丹药品类</div>
              <div className="font-display text-xl text-sect-pill-light">
                {Object.values(PILL_CONFIGS).filter(p => p.unlocked).length} / {Object.keys(PILL_CONFIGS).length}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Sparkles className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">丹药总数</div>
              <div className="font-display text-xl text-green-400">
                {pillInventory.reduce((sum, p) => sum + p.quantity, 0)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Coins className="text-emerald-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">灵草库存</div>
              <div className="font-display text-xl text-emerald-400">
                {herbInventory} 株
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(PILL_CONFIGS).map(pill => {
          const quantity = getPillQuantity(pill.type);
          const isLocked = !pill.unlocked;
          
          return (
            <Card key={pill.type} className={isLocked ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isLocked ? 'bg-gray-500/20' : 'bg-sect-pill/20'
                  }`}>
                    {isLocked ? <Lock size={20} className="text-gray-500" /> : '💊'}
                  </div>
                  <div>
                    <h3 className="font-display text-sect-jade">{pill.name}</h3>
                    <Badge variant="pill" size="sm">库存 {quantity}</Badge>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-sect-jade/60 mb-3">
                {pill.description}
              </p>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-sect-jade/60 flex items-center gap-1">
                    <Sparkles size={14} /> 效果
                  </span>
                  <span className="text-sect-gold text-xs">{pill.effect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sect-jade/60 flex items-center gap-1">
                    <Clock size={14} /> 炼制
                  </span>
                  <span className="text-sect-jade/80 text-xs">{pill.craftTimeDays} 天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sect-jade/60 flex items-center gap-1">
                    <Coins size={14} /> 兑换
                  </span>
                  <span className="text-sect-herb-light text-xs">{pill.contributionCost} 贡献</span>
                </div>
              </div>
              
              {!isLocked && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" disabled>
                    <FlaskConical size={14} className="mr-1" />
                    炼制
                  </Button>
                </div>
              )}
              
              {isLocked && (
                <div className="text-xs text-sect-jade/40 text-center py-2">
                  需解锁丹方后炼制
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
