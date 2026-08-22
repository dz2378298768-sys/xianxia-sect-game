import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sparkles, Trophy } from 'lucide-react';

export const VictoryModal: React.FC = () => {
  const { gameWon, victoryInfo, sectName, dismissVictory, returnToMenu } = useGameStore();

  if (!gameWon || !victoryInfo) return null;

  return (
    <Modal
      isOpen={gameWon}
      onClose={dismissVictory}
      title="飞升仙界 · 游戏胜利"
      size="md"
    >
      <div className="space-y-4 text-center">
        {/* 顶部光环图标 */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400/30 to-amber-600/20 border-2 border-yellow-400/60 flex items-center justify-center">
              <Trophy size={36} className="text-yellow-300" />
            </div>
          </div>
        </div>

        {/* 标题 */}
        <div>
          <h2 className="font-display text-2xl text-gold-gradient mb-1">
            功德圆满 · 飞升仙界
          </h2>
          <p className="text-sm text-sect-jade/60">
            「{sectName}」基业大成，道统永传
          </p>
        </div>

        {/* 飞升弟子信息 */}
        <div className="bg-sect-ink-light/40 border border-sect-gold/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sect-gold">
            <Sparkles size={16} />
            <span className="font-display text-lg">{victoryInfo.discipleName}</span>
          </div>
          <p className="text-sm text-sect-jade/80 leading-relaxed">
            于第 <span className="text-sect-gold font-display">{victoryInfo.year}</span> 年
            <span className="text-sect-gold font-display"> {['春', '夏', '秋', '冬'][victoryInfo.month - 1]}</span>，
            战胜通天塔，白日飞升，踏足仙界。
          </p>
          <p className="text-xs text-sect-jade/50 mt-2">
            宗门历经磨砺，终成一派之祖，传道万世。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="gold" onClick={returnToMenu}>
            返回主菜单
          </Button>
          <Button variant="ghost" onClick={dismissVictory}>
            继续游玩
          </Button>
        </div>

        <p className="text-[10px] text-sect-jade/40">
          选择「继续游玩」可继续经营宗门
        </p>
      </div>
    </Modal>
  );
};
