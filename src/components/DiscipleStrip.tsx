import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { RealmNames, DiscipleStatusNames } from '@/types/disciple';
import { calculateDiscipleCombatPower } from '@/utils/gameLogic';
import { useDevice } from '@/hooks/useDevice';
import { SectIcon } from '@/components/icons/SectIcons';
import { DiscipleAvatar } from '@/components/ui/Avatar';

const REALM_COLORS: Record<string, string> = {
  mortal: 'text-gray-400',
  qi: 'text-blue-400',
  foundation: 'text-green-400',
  golden: 'text-yellow-400',
  nascent: 'text-purple-400',
  spirit: 'text-pink-400',
};

const REALM_SHORT: Record<string, string> = {
  mortal: '凡人',
  qi: '炼气',
  foundation: '筑基',
  golden: '金丹',
  nascent: '元婴',
  spirit: '化神',
};

// 头像统一使用 ui/Avatar 的 DiscipleAvatar


// 头像统一使用 ui/Avatar 的 DiscipleAvatar


export const DiscipleStrip: React.FC = () => {
  const { disciples } = useGameStore();
  const { setSelectedDiscipleId, setActivePanel } = useUIStore();
  const device = useDevice();
  const isCompact = device.isCompact;

  const sortedDisciples = [...disciples].sort((a, b) => {
    const order = { elder: 5, core: 4, inner: 3, outer: 2, servant: 1, mortal: 0 };
    return order[b.status] - order[a.status];
  });

  const handleDiscipleClick = (id: string) => {
    setSelectedDiscipleId(id);
    setActivePanel('disciples');
  };

  return (
    <div className={`absolute left-0 right-0 z-20 ${isCompact ? 'bottom-12 px-1' : 'bottom-20 px-4'}`}>
      <div className="scroll-panel-dark px-2 py-1.5">
        <div className="scroll-title !py-1.5">
          <span className="text-lg">弟</span>
          <span>弟子列表</span>
          <span className="text-xs text-[var(--ink-400)] ml-auto">共 {disciples.length} 人</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5">
          {sortedDisciples.length === 0 ? (
            <div className="w-full py-4 text-center text-[var(--ink-400)] text-sm">
              尚无弟子
            </div>
          ) : (
            sortedDisciples.map(disc => {
              const power = calculateDiscipleCombatPower(disc);

              return (
                <div
                  key={disc.id}
                  className="disciple-card slide-in-left"
                  onClick={() => handleDiscipleClick(disc.id)}
                  title={`${disc.name} · ${RealmNames[disc.realm]}`}
                >
                  {/* 头像 */}
                  <DiscipleAvatar seed={disc.avatarSeed || 0} size={isCompact ? 36 : 48} status={disc.status} realm={disc.realm} name={disc.name} />

                  {/* 姓名 */}
                  <div className="font-display text-xs text-[var(--gold-100)] truncate max-w-full">
                    {disc.name}
                  </div>

                  {/* 境界 */}
                  <div className={`text-[10px] ${REALM_COLORS[disc.realm] || 'text-gray-400'}`}>
                    {REALM_SHORT[disc.realm] || disc.realm}
                  </div>

                  {/* 战力 */}
                  <div className="text-[10px] text-[var(--ink-300)] flex items-center gap-0.5">
                    <SectIcon name="battle" size={10} strokeWidth={2} className="text-[var(--cinnabar)]" />
                    <span>{Math.floor(power).toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
