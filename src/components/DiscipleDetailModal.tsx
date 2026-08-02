import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import { getStageBreakthroughRequired, calculateDiscipleCombatPower } from '@/utils/gameLogic';
import { getRootBoneEffectiveness } from '@/data/buildings';
import { SectIcon } from '@/components/icons/SectIcons';
import { DiscipleAvatar } from '@/components/ui/Avatar';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { BeastTypeNames } from '@/types/beast';
import { Sword } from 'lucide-react';

export const DiscipleDetailModal: React.FC = () => {
  const { selectedDiscipleId, setSelectedDiscipleId } = useUIStore();
  const { disciples, equipItem, unequipItem, artifactInventory, talismanInventory, beastInventory } = useGameStore();
  const disciple = disciples.find(d => d.id === selectedDiscipleId);

  if (!disciple) return null;

  const breakthroughReq = getStageBreakthroughRequired(disciple.realm, disciple.realmStage);
  const rootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents?.rootBone || 50);
  const progressPct = Math.min(100, (disciple.realmProgress / breakthroughReq) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', padding: 0 }}
    >
      <div
        className="relative overflow-hidden modal-body animate-modal-fade-in scroll-panel-dark disciple-detail-wrap"
        style={{
          width: 'min(94vw, 820px)',
          maxHeight: '92vh',
          borderRadius: 6,
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-sect-gold/20 modal-header">
          <SectIcon name="disciple" size={14} strokeWidth={1.8} />
          <span className="font-display text-sm text-gold-gradient">{disciple.name}</span>
          <span className="jade-badge ml-1" style={{ fontSize: 10, padding: '1px 6px' }}>
            {DiscipleStatusNames[disciple.status]}
          </span>
          <button
            className="ml-auto text-sect-jade/60 hover:text-sect-gold transition-colors"
            onClick={() => setSelectedDiscipleId(null)}
          >
            <SectIcon name="close" size={14} strokeWidth={2} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-2 overflow-y-auto modal-content" style={{ maxHeight: 'calc(92vh - 36px)' }}>
          {/* 顶部：头像 + 基础信息 + 修为进度 + 贡献 —— 一行四列紧凑 */}
          <div className="grid grid-cols-12 gap-2 items-center mb-2">
            <div className="col-span-2 flex justify-center">
              <DiscipleAvatar
                seed={disciple.avatarSeed || 0}
                size={48}
                status={disciple.status}
                realm={disciple.realm}
                name={disciple.name}
              />
            </div>
            <div className="col-span-3 min-w-0">
              <div className="font-display text-sect-gold text-sm">{disciple.name}</div>
              <div className="text-[11px] text-sect-jade/80">
                {getRealmDisplay(disciple)} · 战力 {Math.floor(calculateDiscipleCombatPower(disciple))}
              </div>
              <div className="text-[10px] text-sect-jade/50">
                满意度 {Math.floor(disciple.satisfaction)}%
              </div>
            </div>
            {/* 修为进度 */}
            <div className="col-span-5 px-2 py-1 rounded bg-sect-ink-light/30 border border-sect-gold/10">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-sect-jade/60">境界修为</span>
                <span className="text-sect-gold">{Math.floor(progressPct)}%</span>
              </div>
              <div className="scroll-progress mt-1">
                <div
                  className="scroll-progress-fill bg-gradient-to-r from-sect-gold/60 to-sect-gold"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className="text-sect-jade/70">
                  {Math.floor(disciple.realmProgress)} / {breakthroughReq}
                </span>
                <span className={disciple.realmProgress >= breakthroughReq ? 'text-sect-gold' : 'text-sect-jade/40'}>
                  {disciple.realmProgress >= breakthroughReq ? '可突破' : `差 ${Math.ceil(breakthroughReq - disciple.realmProgress)}`}
                </span>
              </div>
            </div>
            {/* 贡献点 */}
            <div className="col-span-2 text-center px-2 py-1 rounded bg-sect-ink-light/30 border border-sect-gold/10">
              <div className="text-[10px] text-sect-jade/60">贡献点</div>
              <div className="font-display text-sm text-sect-gold">
                {Math.floor(disciple.contributionPoints)}
              </div>
            </div>
          </div>

          {/* 天赋属性 + 已学功法 —— 一行两列 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="px-2 py-1.5 rounded bg-sect-ink-light/30 border border-sect-gold/10">
              <div className="text-[10px] text-sect-jade/60 mb-1">天赋属性</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                <div>
                  <span className="text-sect-jade/50">根骨 </span>
                  <span className="text-sect-gold">{disciple.hiddenTalents?.rootBone || 0}</span>
                  <span className="text-sect-jade/40 ml-0.5 text-[10px]">·{Math.floor(rootBoneEff * 100)}%</span>
                </div>
                <div>
                  <span className="text-sect-jade/50">灵韵 </span>
                  <span className="text-sect-gold">{disciple.hiddenTalents?.spiritRhythm || 0}</span>
                </div>
                <div>
                  <span className="text-sect-jade/50">体质 </span>
                  <span className="text-sect-gold">{disciple.hiddenTalents?.constitution || 0}</span>
                </div>
                <div>
                  <span className="text-sect-jade/50">道缘 </span>
                  <span className="text-sect-gold">{disciple.hiddenTalents?.daoFate || 0}</span>
                </div>
              </div>
            </div>

            <div className="px-2 py-1.5 rounded bg-sect-ink-light/30 border border-sect-gold/10 min-h-0">
              <div className="text-[10px] text-sect-jade/60 mb-1">已学功法</div>
              {disciple.learnedTechnique ? (
                <>
                  <div className="text-[11px] text-sect-gold truncate">{disciple.learnedTechnique.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 scroll-progress" style={{ height: 6 }}>
                      <div
                        className="scroll-progress-fill bg-gradient-to-r from-sect-jade/70 to-sect-jade"
                        style={{ width: `${disciple.learnedTechnique.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-sect-jade/70 shrink-0">
                      {disciple.learnedTechnique.isLearned ? '已学成' : `${Math.floor(disciple.learnedTechnique.progress)}%`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-sect-jade/30 italic">尚未习得任何功法</div>
              )}
            </div>
          </div>

          {/* 装备槽 */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 mt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sword size={12} className="text-purple-300" />
              <span className="font-display text-purple-300 text-xs">装备槽</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {/* 法器槽 */}
              <div>
                <div className="text-[9px] text-sect-jade/50 mb-0.5">法器</div>
                {disciple.equippedArtifact ? (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-sect-gold">{ArtifactTypeNames[disciple.equippedArtifact]}</span>
                    <button onClick={() => unequipItem(disciple.id, 'artifact')} className="text-[9px] text-red-400">卸</button>
                  </div>
                ) : (
                  <select
                    className="w-full bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded px-1 py-0.5 text-[9px] text-sect-jade"
                    value=""
                    onChange={e => { if (e.target.value) equipItem(disciple.id, 'artifact', e.target.value); }}
                  >
                    <option value="">空</option>
                    {artifactInventory.filter(a => a.quantity > 0).map(a => (
                      <option key={a.type} value={a.type}>{ArtifactTypeNames[a.type]} ×{a.quantity}</option>
                    ))}
                  </select>
                )}
              </div>
              {/* 符箓槽 */}
              <div>
                <div className="text-[9px] text-sect-jade/50 mb-0.5">符箓</div>
                {disciple.equippedTalisman ? (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-sect-gold">{TalismanTypeNames[disciple.equippedTalisman]}</span>
                    <button onClick={() => unequipItem(disciple.id, 'talisman')} className="text-[9px] text-red-400">卸</button>
                  </div>
                ) : (
                  <select
                    className="w-full bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded px-1 py-0.5 text-[9px] text-sect-jade"
                    value=""
                    onChange={e => { if (e.target.value) equipItem(disciple.id, 'talisman', e.target.value); }}
                  >
                    <option value="">空</option>
                    {talismanInventory.filter(t => t.quantity > 0).map(t => (
                      <option key={t.type} value={t.type}>{TalismanTypeNames[t.type]} ×{t.quantity}</option>
                    ))}
                  </select>
                )}
              </div>
              {/* 灵兽槽 */}
              <div>
                <div className="text-[9px] text-sect-jade/50 mb-0.5">灵兽</div>
                {disciple.equippedBeast ? (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-sect-gold">{BeastTypeNames[disciple.equippedBeast]}</span>
                    <button onClick={() => unequipItem(disciple.id, 'beast')} className="text-[9px] text-red-400">卸</button>
                  </div>
                ) : (
                  <select
                    className="w-full bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/30 rounded px-1 py-0.5 text-[9px] text-sect-jade"
                    value=""
                    onChange={e => { if (e.target.value) equipItem(disciple.id, 'beast', e.target.value); }}
                  >
                    <option value="">空</option>
                    {beastInventory.filter(b => b.quantity > 0).map(b => (
                      <option key={b.type} value={b.type}>{BeastTypeNames[b.type]} ×{b.quantity}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
