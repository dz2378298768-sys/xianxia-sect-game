import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import type { DiscipleStatus } from '@/types/disciple';
import { getStageBreakthroughRequired, calculateDiscipleCombatPower } from '@/utils/gameLogic';
import { getRootBoneEffectiveness } from '@/data/buildings';
import { SectIcon } from '@/components/icons/SectIcons';
import { DiscipleAvatar } from '@/components/ui/Avatar';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { BeastTypeNames } from '@/types/beast';
import { Sword, ChevronUp, History, BookOpen, Sparkles, Trophy, LogOut } from 'lucide-react';
import type { ContributionLogType } from '@/types/game';
import { CONSTITUTIONS, RARITY_COLORS, RARITY_NAMES } from '@/data/constitutions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const DiscipleDetailModal: React.FC = () => {
  const { selectedDiscipleId, setSelectedDiscipleId } = useUIStore();
  const {
    disciples, equipItem, unequipItem, artifactInventory, talismanInventory, beastInventory,
    contributionLogs, canPromoteDisciple, promoteDisciple, kickDisciple,
  } = useGameStore();
  const disciple = disciples.find(d => d.id === selectedDiscipleId);
  const [kickConfirm, setKickConfirm] = useState(false);

  // 贡献流水类型 → 中文名称 + 颜色
  const LogTypeMeta: Record<ContributionLogType, { name: string; color: string }> = {
    work:          { name: '工作产出', color: 'text-amber-300' },
    deduct:        { name: '消耗扣除', color: 'text-rose-300' },
    library:       { name: '藏经推演', color: 'text-cyan-300' },
    learn_secret:  { name: '学习秘籍', color: 'text-violet-300' },
    trial_reward:  { name: '试炼奖励', color: 'text-emerald-300' },
    tournament:    { name: '大比奖励', color: 'text-yellow-300' },
    promotion:     { name: '晋升扣除', color: 'text-orange-300' },
    manual_adjust: { name: '手动调整', color: 'text-fuchsia-300' },
    other:         { name: '其他',     color: 'text-sect-jade/70' },
  };

  if (!disciple) return null;

  const breakthroughReq = getStageBreakthroughRequired(disciple.realm, disciple.realmStage);
  const rootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents?.rootBone || 50);
  const progressPct = Math.min(100, (disciple.realmProgress / breakthroughReq) * 100);

  // 晋升信息（下一级）
  const promoteInfo = canPromoteDisciple(disciple.id);
  const myLogs = contributionLogs.filter(l => l.discipleId === disciple.id).slice(0, 100); // 最多展示 100 条

  // 体质详情
  const constitution = CONSTITUTIONS.find(c => c.id === disciple.constitutionId);
  // 战技
  const battles = disciple.learnedBattles || [];
  // 秘籍（旧系统）
  const secrets = disciple.learnedSecrets || [];
  // 增益
  const buffs = disciple.buffs || [];
  // 大比历史
  const tournaments = disciple.tournamentHistory || [];

  const handlePromote = () => {
    promoteDisciple(disciple.id);
  };

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
          <div className="ml-auto flex items-center gap-1.5">
            {/* 驱逐弟子按钮（长老身份的允许玩家也可驱逐——保留能力） */}
            {kickConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-300">确认驱逐？</span>
                <Button
                  size="sm" variant="outline"
                  className="!border-red-500/60 !text-red-300 hover:!bg-red-500/10 hover:!border-red-400"
                  onClick={() => {
                    kickDisciple(disciple.id);
                    setKickConfirm(false);
                    setSelectedDiscipleId(null);
                  }}
                >确认</Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setKickConfirm(false)}
                >取消</Button>
              </div>
            ) : (
              <Button
                size="sm" variant="outline"
                className="!border-red-500/40 !text-red-300 hover:!bg-red-500/10 hover:!border-red-400"
                onClick={() => setKickConfirm(true)}
                title="驱逐出门"
              >
                <LogOut size={11} /> 驱逐
              </Button>
            )}
            <button
              className="text-sect-jade/60 hover:text-sect-gold transition-colors"
              onClick={() => setSelectedDiscipleId(null)}
            >
              <SectIcon name="close" size={14} strokeWidth={2} />
            </button>
          </div>
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
            {/* 贡献点 + 晋升控制（手动晋升按钮+阈值提示） */}
            <div className="col-span-4 px-2 py-1 rounded bg-sect-ink-light/30 border border-sect-gold/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-sect-jade/60">贡献点</div>
                  <div className="font-display text-sm text-sect-gold">
                    {Math.floor(disciple.contributionPoints)}
                  </div>
                </div>
                {/* 手动晋升按钮：长老除外（已是最高） */}
                {promoteInfo.nextStatus ? (
                  <button
                    onClick={handlePromote}
                    disabled={!promoteInfo.canPromote}
                    className={[
                      'flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-all',
                      promoteInfo.canPromote
                        ? 'border-sect-gold/60 bg-sect-gold/15 text-sect-gold hover:bg-sect-gold/30'
                        : 'border-sect-jade/20 bg-sect-jade/5 text-sect-jade/40 cursor-not-allowed',
                    ].join(' ')}
                    title={promoteInfo.reason}
                  >
                    <ChevronUp size={11} />
                    <span>晋升{DiscipleStatusNames[promoteInfo.nextStatus as DiscipleStatus]}</span>
                  </button>
                ) : null}
              </div>
              {/* 晋升条件说明 */}
              {promoteInfo.nextStatus && (
                <div className={[
                  'mt-1 text-[10px] leading-tight rounded px-1.5 py-0.5 border',
                  promoteInfo.canPromote
                    ? 'text-emerald-300/90 border-emerald-500/20 bg-emerald-500/5'
                    : 'text-sect-jade/60 border-sect-gold/10 bg-sect-ink/40',
                ].join(' ')}>
                  <span className="mr-1 text-sect-gold/80">
                    → {DiscipleStatusNames[promoteInfo.nextStatus as DiscipleStatus]}：
                  </span>
                  {promoteInfo.reason}
                </div>
              )}
              {!promoteInfo.nextStatus && (
                <div className="mt-1 text-[10px] text-sect-jade/40 italic leading-tight">
                  已是最高身份，无需再晋升
                </div>
              )}
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

          {/* 拥有物品 / 能力 —— 体质 + 战技 + 秘籍 + 增益 + 大比历史 */}
          <div className="bg-sect-ink-light/40 border border-sect-gold/20 rounded p-2 mt-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-sect-gold" />
              <span className="font-display text-sect-gold text-xs">拥有物品 / 能力</span>
            </div>

            {/* 体质 */}
            {constitution && (
              <div className="px-2 py-1.5 rounded bg-sect-ink/30 border border-sect-gold/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sect-jade/60">体质</span>
                  <span className={['text-[9px] font-medium', RARITY_COLORS[constitution.rarity]].join(' ')}>
                    {RARITY_NAMES[constitution.rarity]}
                  </span>
                </div>
                <div className={['text-[11px] font-medium', RARITY_COLORS[constitution.rarity]].join(' ')}>
                  {constitution.name}
                </div>
                <div className="text-[10px] text-sect-jade/50 mt-0.5">{constitution.description}</div>
                {/* 体质效果 */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {constitution.effects.cultivationBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/10 text-green-300 border border-green-500/20">修炼+{constitution.effects.cultivationBonus}%</span>
                  ) : null}
                  {constitution.effects.attackBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">攻击+{constitution.effects.attackBonus}</span>
                  ) : null}
                  {constitution.effects.defenseBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">防御+{constitution.effects.defenseBonus}</span>
                  ) : null}
                  {constitution.effects.hpBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">气血+{constitution.effects.hpBonus}</span>
                  ) : null}
                  {constitution.effects.critBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">暴击+{constitution.effects.critBonus}%</span>
                  ) : null}
                  {constitution.effects.dodgeBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">闪避+{constitution.effects.dodgeBonus}%</span>
                  ) : null}
                  {constitution.effects.breakthroughBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">突破+{constitution.effects.breakthroughBonus}%</span>
                  ) : null}
                  {constitution.effects.lifespanBonus ? (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">寿命+{constitution.effects.lifespanBonus}</span>
                  ) : null}
                </div>
              </div>
            )}

            {/* 已学战技 */}
            <div className="px-2 py-1.5 rounded bg-sect-ink/30 border border-sect-gold/10">
              <div className="flex items-center gap-1 mb-1">
                <Sword size={10} className="text-red-300" />
                <span className="text-[10px] text-sect-jade/60">战技（{battles.length}/2）</span>
              </div>
              {battles.length > 0 ? (
                <div className="space-y-1">
                  {battles.map((b, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] text-red-300 truncate">{b.name}</span>
                        {b.isLearned ? (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/15 text-green-300 border border-green-500/20 shrink-0">已学成</span>
                        ) : (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 shrink-0">学习中 {Math.floor(b.progress)}%</span>
                        )}
                      </div>
                      <span className="text-[9px] text-sect-jade/50 shrink-0">战力+{b.combatBonus}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-sect-jade/30 italic">尚未学习战技</div>
              )}
            </div>

            {/* 已学秘籍（旧系统） */}
            {secrets.length > 0 && (
              <div className="px-2 py-1.5 rounded bg-sect-ink/30 border border-sect-gold/10">
                <div className="flex items-center gap-1 mb-1">
                  <BookOpen size={10} className="text-violet-300" />
                  <span className="text-[10px] text-sect-jade/60">秘籍（{secrets.length}）</span>
                </div>
                <div className="space-y-0.5">
                  {secrets.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] text-violet-300">{s.name}</span>
                      <span className="text-[9px] text-sect-jade/50">修炼+{s.cultivationBonus}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 增益效果 */}
            <div className="px-2 py-1.5 rounded bg-sect-ink/30 border border-sect-gold/10">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles size={10} className="text-yellow-300" />
                <span className="text-[10px] text-sect-jade/60">增益效果（{buffs.length}）</span>
              </div>
              {buffs.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {buffs.map(buff => (
                    <div key={buff.id} className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-300/90 border border-yellow-500/20 flex items-center gap-1">
                      <span>{buff.name}</span>
                      <span className="text-yellow-200/60">+{buff.value}%</span>
                      <span className="text-sect-jade/40">·{buff.remainingMonths}月</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-sect-jade/30 italic">当前无增益效果</div>
              )}
            </div>

            {/* 大比历史 */}
            {tournaments.length > 0 && (
              <div className="px-2 py-1.5 rounded bg-sect-ink/30 border border-sect-gold/10">
                <div className="flex items-center gap-1 mb-1">
                  <Trophy size={10} className="text-yellow-300" />
                  <span className="text-[10px] text-sect-jade/60">大比历史（{tournaments.length}）</span>
                </div>
                <div className="max-h-24 overflow-y-auto scrollbar-thin space-y-0.5">
                  {tournaments.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-sect-jade/60">
                        {t.year}年{t.frequency}·{t.scope === 'sect' ? '山门' : '宗门'}大比
                      </span>
                      <span className={t.rank === 1 ? 'text-yellow-300' : t.rank > 0 ? 'text-sect-gold' : 'text-sect-jade/40'}>
                        {t.rank === 1 ? '冠军' : t.rank === 2 ? '亚军' : t.rank === 3 ? '季军' : '未入三甲'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 贡献值流水 */}
          <div className="bg-sect-ink-light/40 border border-sect-gold/20 rounded p-2 mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <History size={12} className="text-sect-gold" />
                <span className="font-display text-sect-gold text-xs">贡献值流水</span>
                <span className="text-[9px] text-sect-jade/40">（最近 {myLogs.length} 条）</span>
              </div>
              <div className="text-[10px] text-sect-jade/60">
                当前余额：<span className="text-sect-gold">{Math.floor(disciple.contributionPoints)}</span>
              </div>
            </div>

            {myLogs.length === 0 ? (
              <div className="text-[10px] text-sect-jade/30 italic py-3 text-center">
                暂无贡献值流水记录，下个月开始工作、推演、晋升等操作后将自动生成
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto scrollbar-thin pr-0.5 space-y-1">
                {myLogs.map(log => {
                  const meta = LogTypeMeta[log.type] || LogTypeMeta.other;
                  const positive = log.amount >= 0;
                  return (
                    <div key={log.id} className="flex items-center gap-2 px-1.5 py-1 rounded bg-sect-ink/30 border border-sect-gold/5">
                      <span className="text-[9px] text-sect-jade/50 shrink-0 w-14 tabular-nums">
                        {log.date.year}年{String(log.date.month).padStart(2, '0')}月
                      </span>
                      <span className={['shrink-0 w-14 text-[9px] font-medium', meta.color].join(' ')}>
                        {meta.name}
                      </span>
                      <span className={[
                        'shrink-0 w-14 text-right text-[10px] tabular-nums',
                        positive ? 'text-emerald-300' : 'text-rose-300',
                      ].join(' ')}>
                        {positive ? '+' : ''}{log.amount}
                      </span>
                      <span className="shrink-0 w-12 text-right text-[9px] text-sect-jade/50 tabular-nums">
                        余 {log.balance}
                      </span>
                      <span className="flex-1 text-[10px] text-sect-jade/80 truncate">
                        {log.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
