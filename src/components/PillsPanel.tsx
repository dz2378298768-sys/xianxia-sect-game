import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PILL_CONFIGS } from '@/data/pills';
import { PILL_RECIPES, RECIPE_MAP } from '@/data/recipes';
import type { PillType } from '@/types/pill';
import type { CraftingTask } from '@/types/crafting';
import { QualityNames, QualityColors } from '@/types/crafting';
import { FlaskConical, Lock, Sparkles, Clock, Coins, Beaker, AlertCircle, CheckCircle, X, Play } from 'lucide-react';
import { SectIcon } from '@/components/icons/SectIcons';

export const PillsPanel: React.FC = () => {
  const {
    pillInventory, herbInventory, spiritStones, unlockedPillRecipes,
    craftingTasks, startCrafting, cancelCrafting, disciples,
  } = useGameStore();

  const getPillQuantity = (type: PillType): number => {
    const pill = pillInventory.find(p => p.type === type);
    return pill?.quantity || 0;
  };

  // 活跃的炼丹任务
  const activeTasks = craftingTasks.filter(t => t.category === 'pill');

  // 可用的炼制弟子（有炼丹天赋的）
  const craftableDisciples = disciples.filter(d =>
    d.status === 'inner' || d.status === 'core' || d.status === 'elder'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gold-gradient">丹药宝库</h1>
        <p className="text-sect-jade/60 text-sm mt-1">
          炼制与管理丹药，辅助弟子修炼突破
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <FlaskConical className="text-sect-pill" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">丹方解锁</div>
              <div className="font-display text-xl text-sect-pill-light">
                {unlockedPillRecipes.length} / {PILL_RECIPES.length}
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
              <div className="text-sect-jade/60 text-xs">丹药库存</div>
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
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Beaker className="text-blue-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">炼制中</div>
              <div className="font-display text-xl text-blue-400">
                {activeTasks.length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 活跃炼制任务 */}
      {activeTasks.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-sect-jade mb-3">炼制中</h2>
          <div className="space-y-2">
            {activeTasks.map(task => {
              const recipe = RECIPE_MAP[task.recipeId];
              const progress = Math.min(100, Math.round((task.elapsedDays / task.totalDays) * 100));
              const disciple = task.discipleId ? disciples.find(d => d.id === task.discipleId) : null;
              return (
                <Card key={task.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sect-pill/20 flex items-center justify-center">
                        <SectIcon name="pill" size={20} strokeWidth={1.8} className="text-sect-pill-light" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-sect-jade">{recipe?.name ?? '未知丹药'}</div>
                        <div className="text-xs text-sect-jade/60">
                          炼制弟子: {disciple?.name ?? '未指定'} | 进度 {task.elapsedDays}/{task.totalDays}天
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-gray-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sect-pill to-sect-pill-light transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <button
                        onClick={() => cancelCrafting(task.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 丹方列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILL_RECIPES.map(recipe => {
          const pillConfig = PILL_CONFIGS[recipe.id.replace('pill_', '') as PillType];
          const isUnlocked = unlockedPillRecipes.includes(recipe.id.replace('pill_', '') as PillType);
          const quantity = getPillQuantity(recipe.id.replace('pill_', '') as PillType);
          const isCrafting = activeTasks.some(t => t.recipeId === recipe.id);

          // 检查材料是否足够
          const canCraft = recipe.baseMaterials.every(mat => {
            if (mat.name === '灵草') return herbInventory >= mat.amount;
            return true; // 简化检查
          });

          return (
            <Card key={recipe.id} className={!isUnlocked ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    !isUnlocked ? 'bg-gray-500/20' : 'bg-sect-pill/20'
                  }`}>
                    {!isUnlocked ? (
                      <Lock size={20} className="text-gray-500" />
                    ) : (
                      <SectIcon name="pill" size={24} strokeWidth={1.8} className="text-sect-pill-light" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-sect-jade">{recipe.name}</h3>
                    <Badge variant="pill" size="sm">库存 {quantity}</Badge>
                  </div>
                </div>
              </div>

              <p className="text-xs text-sect-jade/60 mb-3">
                {recipe.description}
              </p>

              {/* 材料需求 */}
              <div className="space-y-1 mb-3">
                <div className="text-xs text-sect-jade/60 font-medium">材料需求：</div>
                {recipe.baseMaterials.map((mat, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-sect-jade/60">{mat.name}</span>
                    <span className="text-sect-jade/80">x{mat.amount}</span>
                  </div>
                ))}
                {recipe.optionalMaterials && recipe.optionalMaterials.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-white/5">
                    <div className="text-xs text-sect-jade/40">可选辅料（提升品质）：</div>
                    {recipe.optionalMaterials.map((mat, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-sect-jade/40">{mat.name}</span>
                        <span className="text-sect-jade/60">x{mat.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-sect-jade/60 flex items-center gap-1">
                    <Clock size={14} /> 炼制时间
                  </span>
                  <span className="text-sect-jade/80 text-xs">{recipe.baseCraftTime} 天</span>
                </div>
              </div>

              {isUnlocked && !isCrafting && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost" size="sm" className="flex-1"
                    disabled={!canCraft}
                    onClick={() => {
                      const pillType = recipe.id.replace('pill_', '') as PillType;
                      const result = startCrafting(recipe.id, 'pill', pillType, null, 1);
                      if (!result.success) {
                        alert(result.reason ?? '炼制失败');
                      }
                    }}
                  >
                    <Play size={14} className="mr-1" />
                    开始炼制
                  </Button>
                </div>
              )}

              {isCrafting && (
                <div className="text-xs text-blue-400 text-center py-2 flex items-center justify-center gap-1">
                  <Beaker size={14} className="animate-pulse" />
                  炼制中...
                </div>
              )}

              {!isUnlocked && (
                <div className="text-xs text-sect-jade/40 text-center py-2">
                  <Lock size={12} className="inline mr-1" />
                  需解锁丹方后炼制
                  {recipe.unlockHint && <span className="block mt-1">({recipe.unlockHint})</span>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};