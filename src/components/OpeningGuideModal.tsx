import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import { Coins, Users, Swords, ShoppingCart } from 'lucide-react';

/**
 * 开局提醒弹窗（需求3）：新游戏开始时展示灵石获取途径
 */
export const OpeningGuideModal: React.FC = () => {
  const { showOpeningGuide, setShowOpeningGuide } = useUIStore();

  if (!showOpeningGuide) return null;

  const ways = [
    {
      icon: <Users size={20} className="text-sect-gold" />,
      title: '杂役堂升级并保证满员',
      desc: '杂役弟子每季度为宗门产出灵石，升级杂役堂、招满编制可稳定获得灵石收入。',
    },
    {
      icon: <Swords size={20} className="text-sect-gold" />,
      title: '附庸其他宗门与参加试炼',
      desc: '在「世界」面板附庸弱小宗门获得每季度上贡；派遣弟子参加试炼也能带回大量灵石。',
    },
    {
      icon: <ShoppingCart size={20} className="text-sect-gold" />,
      title: '卖出丹药、武器等物品',
      desc: '在坊市出售富余的丹药、法器、符箓等产出，换取灵石周转。',
    },
  ];

  return (
    <Modal
      isOpen={showOpeningGuide}
      onClose={() => setShowOpeningGuide(false)}
      title="宗门初立 · 灵石之道"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sect-gold/90">
          <Coins size={18} />
          <span className="text-sm font-medium">灵石乃修行之本，宗门初立，当明其来源：</span>
        </div>

        <div className="space-y-3">
          {ways.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/15"
            >
              <div className="p-2 rounded-lg bg-sect-gold/10 shrink-0">{w.icon}</div>
              <div className="min-w-0">
                <div className="font-display text-sect-jade text-sm flex items-center gap-2">
                  <span className="text-sect-gold/70">{i + 1}.</span>
                  {w.title}
                </div>
                <p className="text-xs text-sect-jade/60 mt-1 leading-relaxed">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-sect-gold/5 border border-sect-gold/20 text-xs text-sect-jade/70 leading-relaxed">
          提示：弟子现由你<b className="text-sect-gold">手动招收</b>，且每名弟子每季度需按身份等级发放维护费
          （杂役1 / 外门2 / 内门4 / 核心6 / 长老10 灵石）。善用量入为出，方能基业长青。
        </div>

        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-400/20 text-xs text-sect-jade/70 leading-relaxed">
          正邪之道：行事乖张（如逐出弟子、侮辱他宗）会<b className="text-rose-300">削减正邪度</b>，过低时将招致正道联军讨伐；
          但<b className="text-sect-gold">每年正邪度会自然回归中立 +1</b>，在「世界」面板<b className="text-sect-gold">赠送灵石示好</b>其他宗门亦可恢复正邪度。
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="gold" size="sm" onClick={() => setShowOpeningGuide(false)}>
            禀知，入宗！
          </Button>
        </div>
      </div>
    </Modal>
  );
};
