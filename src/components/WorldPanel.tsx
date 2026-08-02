import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectIcon } from '@/components/icons/SectIcons';
import {
  SectAlignmentNames, SectRelationNames, SectLevelNames,
  DiplomaticStatusNames,
} from '@/types/game';
import type { OtherSect, SectAlignment, SectRelation, DiplomaticStatus } from '@/types/game';

// 阵营对应的图片
const ALIGNMENT_IMAGE: Record<SectAlignment, string> = {
  righteous: '/world/sect-righteous.jpg',
  demonic: '/world/sect-demonic.jpg',
  neutral: '/world/sect-neutral.jpg',
};

// 关系对应的图标
const RELATION_ICON: Record<SectRelation, 'talisman' | 'crystal' | 'balance' | 'warning' | 'sword'> = {
  ally: 'talisman',
  friendly: 'crystal',
  neutral: 'balance',
  wary: 'warning',
  hostile: 'sword',
};

// 外交状态对应的样式
const DIPLO_STYLE: Record<DiplomaticStatus, string> = {
  neutral: 'text-[var(--ink-300)] border-[var(--ink-400)]/30',
  ally: 'text-[var(--jade-light)] border-[var(--jade-light)]/40',
  rival: 'text-red-400 border-red-400/40',
  vassal: 'text-[var(--gold-300)] border-[var(--gold-300)]/40',
};

const DIPLO_OPTIONS: { value: DiplomaticStatus; label: string; icon: string }[] = [
  { value: 'neutral', label: '中立', icon: 'balance' },
  { value: 'ally', label: '同盟', icon: 'talisman' },
  { value: 'rival', label: '宿敌', icon: 'sword' },
  { value: 'vassal', label: '附庸', icon: 'crystal' },
];

const WorldSectCard: React.FC<{ sect: OtherSect }> = ({ sect }) => {
  const store = useGameStore();
  const [showActions, setShowActions] = useState(false);

  const bannerStyle: React.CSSProperties = sect.image
    ? { backgroundImage: `url(${sect.image})` }
    : { backgroundImage: `url(${ALIGNMENT_IMAGE[sect.alignment]})` };

  const fav = sect.favorability ?? 50;
  const favColor = fav >= 70 ? 'text-[var(--jade-light)]' : fav >= 40 ? 'text-[var(--gold-300)]' : 'text-red-400';
  const favBarColor = fav >= 70 ? 'from-[var(--jade-light)] to-[var(--jade)]' : fav >= 40 ? 'from-[var(--gold-500)] to-[var(--gold-300)]' : 'from-red-600 to-red-400';

  return (
    <div className="world-sect-card">
      <div className="world-sect-banner" style={bannerStyle}>
        <span className={`world-sect-alignment-badge alignment-${sect.alignment}`}>
          {SectAlignmentNames[sect.alignment]}
        </span>
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <div className="font-display text-sm text-[var(--gold-200)] truncate">{sect.name}</div>
        <span className="text-[10px] text-[var(--ink-400)] shrink-0 ml-2">{SectLevelNames[sect.level]}</span>
      </div>

      <div className="text-[11px] text-[var(--ink-300)] mb-2 leading-relaxed line-clamp-2">
        {sect.description}
      </div>

      <div className="grid grid-cols-3 gap-1 text-[10px] text-center mb-2">
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-1">
          <div className="text-[var(--ink-400)]">战力</div>
          <div className="text-[var(--cinnabar)] font-bold">{sect.combatPower.toLocaleString()}</div>
        </div>
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-1">
          <div className="text-[var(--ink-400)]">弟子</div>
          <div className="text-[var(--jade-light)] font-bold">{sect.discipleCount}</div>
        </div>
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-1">
          <div className="text-[var(--ink-400)]">距离</div>
          <div className="text-[var(--gold-300)] font-bold">{sect.distance}里</div>
        </div>
      </div>

      {/* 好感度条 */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[var(--ink-400)] mb-0.5">
          <span className="flex items-center gap-1">
            <SectIcon name="crystal" size={11} strokeWidth={1.8} className={favColor} />
            好感度
          </span>
          <span className={favColor}>{fav}/100</span>
        </div>
        <div className="h-1 rounded-full bg-[rgba(30,40,60,0.6)] overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${favBarColor} transition-all`} style={{ width: `${fav}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] mb-2">
        <span className="text-[var(--ink-400)] flex items-center gap-1">
          <SectIcon name="book" size={11} strokeWidth={1.8} className="text-[var(--violet)]" />
          <span className="truncate">{sect.specialty}</span>
        </span>
        <span className={`relation-${sect.relation} flex items-center gap-1 font-medium`}>
          <SectIcon name={RELATION_ICON[sect.relation]} size={11} strokeWidth={1.8} />
          {SectRelationNames[sect.relation]}
        </span>
      </div>

      {/* 外交状态 + 交易状态 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded border ${DIPLO_STYLE[sect.diplomaticStatus ?? 'neutral']}`}>
          {DiplomaticStatusNames[sect.diplomaticStatus ?? 'neutral']}
        </span>
        {sect.tradeActive && (
          <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--gold-300)]/40 text-[var(--gold-300)] flex items-center gap-0.5">
            <SectIcon name="gem" size={10} strokeWidth={1.8} />
            交易中
          </span>
        )}
      </div>

      {/* 互动按钮 */}
      <button
        onClick={() => setShowActions(!showActions)}
        className="w-full text-[11px] py-1.5 rounded border border-[var(--gold-300)]/30 text-[var(--gold-300)] hover:bg-[var(--gold-300)]/10 transition-colors flex items-center justify-center gap-1.5"
      >
        <SectIcon name="talisman" size={12} strokeWidth={1.8} />
        {showActions ? '收起互动' : '宗门互动'}
      </button>

      {showActions && (
        <div className="mt-2 space-y-2 p-2 rounded bg-[rgba(20,28,40,0.8)] border border-[var(--gold-300)]/15">
          {/* 好感度增减 */}
          <div>
            <div className="text-[10px] text-[var(--ink-400)] mb-1">好感度操作</div>
            <div className="flex gap-1">
              <button
                onClick={() => store.changeSectFavorability(sect.id, 5)}
                className="flex-1 text-[10px] py-1 rounded bg-[var(--jade-light)]/15 text-[var(--jade-light)] hover:bg-[var(--jade-light)]/25 transition-colors border border-[var(--jade-light)]/30"
              >
                +5 好感
              </button>
              <button
                onClick={() => store.changeSectFavorability(sect.id, -5)}
                className="flex-1 text-[10px] py-1 rounded bg-red-400/15 text-red-400 hover:bg-red-400/25 transition-colors border border-red-400/30"
              >
                -5 好感
              </button>
            </div>
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => store.changeSectFavorability(sect.id, 10)}
                className="flex-1 text-[10px] py-1 rounded bg-[var(--jade-light)]/15 text-[var(--jade-light)] hover:bg-[var(--jade-light)]/25 transition-colors border border-[var(--jade-light)]/30"
              >
                +10 好感
              </button>
              <button
                onClick={() => store.changeSectFavorability(sect.id, -10)}
                className="flex-1 text-[10px] py-1 rounded bg-red-400/15 text-red-400 hover:bg-red-400/25 transition-colors border border-red-400/30"
              >
                -10 好感
              </button>
            </div>
          </div>

          {/* 外交状态 */}
          <div>
            <div className="text-[10px] text-[var(--ink-400)] mb-1">外交状态</div>
            <div className="grid grid-cols-2 gap-1">
              {DIPLO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => store.setSectDiplomaticStatus(sect.id, opt.value)}
                  className={`text-[10px] py-1 rounded border transition-all flex items-center justify-center gap-1 ${
                    (sect.diplomaticStatus ?? 'neutral') === opt.value
                      ? `${DIPLO_STYLE[opt.value]} bg-current/10`
                      : 'text-[var(--ink-300)] border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
                  }`}
                >
                  <SectIcon name={opt.icon as any} size={10} strokeWidth={1.8} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 交易 */}
          <div>
            <div className="text-[10px] text-[var(--ink-400)] mb-1">交易</div>
            <button
              onClick={() => {
                const ok = store.toggleSectTrade(sect.id);
                if (!ok && !sect.tradeActive) {
                  alert('灵石不足！开启交易需 50 灵石。');
                }
              }}
              className={`w-full text-[10px] py-1.5 rounded border transition-all flex items-center justify-center gap-1 ${
                sect.tradeActive
                  ? 'bg-[var(--gold-300)]/15 text-[var(--gold-300)] border-[var(--gold-300)]/40 hover:bg-[var(--gold-300)]/25'
                  : 'bg-[var(--ink-400)]/10 text-[var(--ink-300)] border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
              }`}
            >
              <SectIcon name="gem" size={11} strokeWidth={1.8} />
              {sect.tradeActive ? '结束交易（获得收益）' : '开启交易（-50灵石）'}
            </button>
            {!sect.tradeActive && (
              <div className="text-[9px] text-[var(--ink-500)] text-center mt-0.5">
                交易可获得灵石与声望
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const WorldPanel: React.FC = () => {
  const { otherSects, refreshOtherSects } = useGameStore();

  // 统计
  const allyCount = otherSects.filter(s => s.relation === 'ally' || s.relation === 'friendly').length;
  const hostileCount = otherSects.filter(s => s.relation === 'hostile' || s.relation === 'wary').length;
  const righteousCount = otherSects.filter(s => s.alignment === 'righteous').length;
  const demonicCount = otherSects.filter(s => s.alignment === 'demonic').length;

  // 外交统计
  const allyDiploCount = otherSects.filter(s => s.diplomaticStatus === 'ally').length;
  const rivalDiploCount = otherSects.filter(s => s.diplomaticStatus === 'rival').length;
  const vassalDiploCount = otherSects.filter(s => s.diplomaticStatus === 'vassal').length;
  const tradeCount = otherSects.filter(s => s.tradeActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-gold-gradient flex items-center gap-2">
            <SectIcon name="world" size={24} strokeWidth={1.8} className="text-sect-gold" />
            天下大势
          </h1>
          <p className="text-sect-jade/60 text-sm mt-1">
            天下宗门林立，正邪纷争，须时时留意周边动向
          </p>
        </div>
        <button
          className="btn-ink text-xs flex items-center gap-1.5"
          onClick={refreshOtherSects}
          title="重新打探天下宗门情报"
        >
          <SectIcon name="nextMonth" size={13} strokeWidth={2} />
          <span>刷新情报</span>
        </button>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(212,168,87,0.15)]">
              <SectIcon name="group" size={20} strokeWidth={1.8} className="text-sect-gold" />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">已知宗门</div>
              <div className="font-display text-xl text-sect-gold">{otherSects.length}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(74,122,107,0.2)]">
              <SectIcon name="crystal" size={20} strokeWidth={1.8} className="text-sect-jade-light" />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">盟友/友好</div>
              <div className="font-display text-xl text-sect-jade-light">{allyCount}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(194,58,46,0.2)]">
              <SectIcon name="sword" size={20} strokeWidth={1.8} className="text-red-400" />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">戒备/敌对</div>
              <div className="font-display text-xl text-red-400">{hostileCount}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(123,94,167,0.2)]">
              <SectIcon name="balance" size={20} strokeWidth={1.8} className="text-sect-spirit" />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">正/魔</div>
              <div className="font-display text-sm">
                <span className="text-sect-jade-light">{righteousCount}</span>
                <span className="text-sect-jade/40 mx-1">/</span>
                <span className="text-red-400">{demonicCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 外交统计 */}
      {(allyDiploCount > 0 || rivalDiploCount > 0 || vassalDiploCount > 0 || tradeCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {allyDiploCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[rgba(74,122,107,0.15)] border border-[var(--jade-light)]/30 text-xs text-[var(--jade-light)] flex items-center gap-1.5">
              <SectIcon name="talisman" size={13} strokeWidth={1.8} />
              同盟 {allyDiploCount}
            </div>
          )}
          {rivalDiploCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[rgba(194,58,46,0.15)] border border-red-400/30 text-xs text-red-400 flex items-center gap-1.5">
              <SectIcon name="sword" size={13} strokeWidth={1.8} />
              宿敌 {rivalDiploCount}
            </div>
          )}
          {vassalDiploCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[rgba(212,168,87,0.15)] border border-[var(--gold-300)]/30 text-xs text-[var(--gold-300)] flex items-center gap-1.5">
              <SectIcon name="crystal" size={13} strokeWidth={1.8} />
              附庸 {vassalDiploCount}
            </div>
          )}
          {tradeCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[rgba(212,168,87,0.1)] border border-[var(--gold-300)]/20 text-xs text-[var(--gold-200)] flex items-center gap-1.5">
              <SectIcon name="gem" size={13} strokeWidth={1.8} />
              交易中 {tradeCount}
            </div>
          )}
        </div>
      )}

      {/* 宗门列表 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg text-gold-gradient">天下宗门</h2>
            <Badge variant="default" size="sm">{otherSects.length} 个</Badge>
          </div>
        </div>

        <p className="text-sect-jade/50 text-xs mb-4 leading-relaxed">
          各宗门实力、阵营、与你的关系每月皆有可能变动。点击"宗门互动"可进行好感度操作、设置外交状态（同盟/宿敌/附庸）以及开启交易。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {otherSects.map(sect => (
            <WorldSectCard key={sect.id} sect={sect} />
          ))}
        </div>

        {otherSects.length === 0 && (
          <div className="text-center py-8 text-sect-jade/40 text-sm">
            暂无天下宗门情报，点击"刷新情报"打探
          </div>
        )}
      </Card>
    </div>
  );
};
