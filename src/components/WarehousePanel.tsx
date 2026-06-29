import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
import { FlaskConical, Lock, Sparkles, Clock, Coins, Sword, ScrollText, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

type WarehouseTab = 'pills' | 'artifacts' | 'talismans';

export const WarehousePanel: React.FC = () => {
  const { pillInventory, artifactInventory, talismanInventory, spiritStones, herbInventory } = useGameStore();
  const [activeTab, setActiveTab] = useState<WarehouseTab>('pills');
  
  const getPillQuantity = (type: PillType): number => {
    const pill = pillInventory.find(p => p.type === type);
    return pill?.quantity || 0;
  };
  
  const getArtifactQuantity = (type: ArtifactType): number => {
    const artifact = artifactInventory.find(a => a.type === type);
    return artifact?.quantity || 0;
  };
  
  const getTalismanQuantity = (type: TalismanType): number => {
    const talisman = talismanInventory.find(t => t.type === type);
    return talisman?.quantity || 0;
  };

  const tabs: { id: WarehouseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pills', label: '丹药库', icon: <FlaskConical size={16} /> },
    { id: 'artifacts', label: '炼器库', icon: <Sword size={16} /> },
    { id: 'talismans', label: '符库', icon: <ScrollText size={16} /> },
  ];

  const renderStats = () => {
    if (activeTab === 'pills') {
      return (
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
      );
    }
    
    if (activeTab === 'artifacts') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Sword className="text-blue-400" size={24} />
              </div>
              <div>
                <div className="text-sect-jade/60 text-xs">法器品类</div>
                <div className="font-display text-xl text-blue-400">
                  {Object.values(ARTIFACT_CONFIGS).filter(a => a.unlocked).length} / {Object.keys(ARTIFACT_CONFIGS).length}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Package className="text-purple-400" size={24} />
              </div>
              <div>
                <div className="text-sect-jade/60 text-xs">法器总数</div>
                <div className="font-display text-xl text-purple-400">
                  {artifactInventory.reduce((sum, a) => sum + a.quantity, 0)}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Coins className="text-yellow-400" size={24} />
              </div>
              <div>
                <div className="text-sect-jade/60 text-xs">灵石储备</div>
                <div className="font-display text-xl text-yellow-400">
                  {spiritStones}
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <ScrollText className="text-red-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">符箓品类</div>
              <div className="font-display text-xl text-red-400">
                {Object.values(TALISMAN_CONFIGS).filter(t => t.unlocked).length} / {Object.keys(TALISMAN_CONFIGS).length}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Package className="text-orange-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">符箓总数</div>
              <div className="font-display text-xl text-orange-400">
                {talismanInventory.reduce((sum, t) => sum + t.quantity, 0)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Coins className="text-yellow-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">灵石储备</div>
              <div className="font-display text-xl text-yellow-400">
                {spiritStones}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderPills = () => (
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
  );

  const renderArtifacts = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.values(ARTIFACT_CONFIGS).map(artifact => {
        const quantity = getArtifactQuantity(artifact.type);
        const isLocked = !artifact.unlocked;
        const tierColors = {
          low: 'text-gray-400',
          middle: 'text-green-400',
          high: 'text-blue-400',
          top: 'text-purple-400',
        };
        const tierNames = {
          low: '下品',
          middle: '中品',
          high: '上品',
          top: '极品',
        };
        
        return (
          <Card key={artifact.type} className={isLocked ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  isLocked ? 'bg-gray-500/20' : 'bg-blue-500/20'
                }`}>
                  {isLocked ? <Lock size={20} className="text-gray-500" /> : '⚔️'}
                </div>
                <div>
                  <h3 className="font-display text-sect-jade">{artifact.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="pill" size="sm">库存 {quantity}</Badge>
                    <span className={`text-xs ${tierColors[artifact.tier]}`}>{tierNames[artifact.tier]}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-sect-jade/60 mb-3">
              {artifact.description}
            </p>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-sect-jade/60 flex items-center gap-1">
                  <Sparkles size={14} /> 效果
                </span>
                <span className="text-sect-gold text-xs">{artifact.effect}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60 flex items-center gap-1">
                  <Clock size={14} /> 炼制
                </span>
                <span className="text-sect-jade/80 text-xs">{artifact.craftTimeDays} 天</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60 flex items-center gap-1">
                  <Coins size={14} /> 兑换
                </span>
                <span className="text-sect-herb-light text-xs">{artifact.contributionCost} 贡献</span>
              </div>
            </div>
            
            {!isLocked && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" disabled>
                  <Sword size={14} className="mr-1" />
                  炼制
                </Button>
              </div>
            )}
            
            {isLocked && (
              <div className="text-xs text-sect-jade/40 text-center py-2">
                需解锁图谱后炼制
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderTalismans = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.values(TALISMAN_CONFIGS).map(talisman => {
        const quantity = getTalismanQuantity(talisman.type);
        const isLocked = !talisman.unlocked;
        const tierColors = {
          low: 'text-gray-400',
          middle: 'text-green-400',
          high: 'text-blue-400',
          top: 'text-purple-400',
        };
        const tierNames = {
          low: '下品',
          middle: '中品',
          high: '上品',
          top: '极品',
        };
        
        return (
          <Card key={talisman.type} className={isLocked ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  isLocked ? 'bg-gray-500/20' : 'bg-red-500/20'
                }`}>
                  {isLocked ? <Lock size={20} className="text-gray-500" /> : '📜'}
                </div>
                <div>
                  <h3 className="font-display text-sect-jade">{talisman.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="pill" size="sm">库存 {quantity}</Badge>
                    <span className={`text-xs ${tierColors[talisman.tier]}`}>{tierNames[talisman.tier]}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-sect-jade/60 mb-3">
              {talisman.description}
            </p>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-sect-jade/60 flex items-center gap-1">
                  <Sparkles size={14} /> 效果
                </span>
                <span className="text-sect-gold text-xs">{talisman.effect}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60 flex items-center gap-1">
                  <Clock size={14} /> 绘制
                </span>
                <span className="text-sect-jade/80 text-xs">{talisman.craftTimeDays} 天</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60 flex items-center gap-1">
                  <Coins size={14} /> 兑换
                </span>
                <span className="text-sect-herb-light text-xs">{talisman.contributionCost} 贡献</span>
              </div>
            </div>
            
            {!isLocked && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" disabled>
                  <ScrollText size={14} className="mr-1" />
                  绘制
                </Button>
              </div>
            )}
            
            {isLocked && (
              <div className="text-xs text-sect-jade/40 text-center py-2">
                需解锁符谱后绘制
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'pills':
        return renderPills();
      case 'artifacts':
        return renderArtifacts();
      case 'talismans':
        return renderTalismans();
      default:
        return renderPills();
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gold-gradient">仓库</h1>
        <p className="text-sect-jade/60 text-sm mt-1">
          管理宗门丹药、法器与符箓储备
        </p>
      </div>

      <div className="flex gap-2 border-b border-sect-gold/20 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-t-lg font-display text-sm transition-all duration-200',
              activeTab === tab.id
                ? 'bg-sect-gold/10 text-sect-gold border-b-2 border-sect-gold -mb-[2px]'
                : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-gold/5'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      {renderStats()}
      
      {renderContent()}
    </div>
  );
};
