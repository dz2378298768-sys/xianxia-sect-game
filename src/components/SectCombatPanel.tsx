import React, { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { computeSectCombatSummary, getSchoolTalentBonuses } from '@/utils/gameLogic';
import { Sword, Shield, Star, Users, Building2, Trophy } from 'lucide-react';

/** 宗门战力统计面板 */
export const SectCombatPanel: React.FC = () => {
  const { disciples, buildings, sectSchool, unlockedTalents } = useGameStore();

  const summary = useMemo(
    () => computeSectCombatSummary(disciples, buildings, getSchoolTalentBonuses(sectSchool, unlockedTalents)),
    [disciples, buildings, sectSchool, unlockedTalents],
  );

  // 战力条颜色
  const barColors = [
    'linear-gradient(90deg, #f59e0b, #fbbf24)',
    'linear-gradient(90deg, #3b82f6, #60a5fa)',
    'linear-gradient(90deg, #10b981, #34d399)',
    'linear-gradient(90deg, #8b5cf6, #a78bfa)',
    'linear-gradient(90deg, #ef4444, #f87171)',
    'linear-gradient(90deg, #ec4899, #f472b6)',
  ];

  // 身份 / 境界两栏各自取最大值，避免某一栏的条超过 100%
  const maxStatusPower = Math.max(...summary.byStatus.map(g => g.power), 1);
  const maxRealmPower = Math.max(...summary.byRealm.map(g => g.power), 1);

  return (
    <div className="panel-sheet">
      {/* 总战力卡片 */}
      <Card title="宗门战力" icon={<Sword size={14} className="text-red-400/60" strokeWidth={1.8} />}>
        {/* 总战力大数字 */}
        <div className="text-center py-3">
          <div className="text-[11px]" style={{ color: 'var(--ink-400)' }}>宗门总战力</div>
          <div className="font-display font-bold" style={{ fontSize: '34px', color: 'var(--gold-200)' }}>
            {summary.totalPower.toLocaleString()}
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--ink-400)' }}>
            弟子基础 {summary.basePower.toLocaleString()} · 弟子 {summary.discipleCount} 人
          </div>
        </div>

        {/* 建筑加成 */}
        {summary.buildingBonuses.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {summary.buildingBonuses.map((b, i) => (
              <div
                key={i}
                className="px-2 py-1 rounded text-[10px] border"
                style={{
                  borderColor: 'rgba(251,191,36,0.3)',
                  background: 'rgba(251,191,36,0.08)',
                  color: 'var(--gold-200)',
                }}
              >
                {b.description}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 身份战力分布 */}
      <Card title="身份战力分布" icon={<Users size={14} className="text-blue-400/60" strokeWidth={1.8} />}>
        <div className="space-y-2">
          {summary.byStatus.map((g, i) => {
            const pct = (g.power / maxStatusPower) * 100;
            return (
              <div key={g.status} className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0" style={{ color: 'var(--ink-300)' }}>{g.status}</span>
                <span className="w-10 text-right shrink-0 font-mono" style={{ color: 'var(--ink-100)' }}>
                  {g.count}人
                </span>
                <div className="flex-1 h-3 rounded-full" style={{ background: 'rgba(13,17,23,0.5)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: barColors[i % barColors.length] }}
                  />
                </div>
                <span className="w-16 text-right shrink-0 font-mono" style={{ color: 'var(--ink-200)' }}>
                  {g.power.toLocaleString()}
                </span>
              </div>
            );
          })}
          {summary.byStatus.length === 0 && (
            <div className="text-xs italic" style={{ color: 'var(--ink-400)' }}>暂无弟子</div>
          )}
        </div>
      </Card>

      {/* 境界战力分布 */}
      <Card title="境界战力分布" icon={<Star size={14} className="text-purple-400/60" strokeWidth={1.8} />}>
        <div className="space-y-2">
          {summary.byRealm.map((g, i) => {
            const pct = (g.power / maxRealmPower) * 100;
            return (
              <div key={g.realm} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0" style={{ color: 'var(--ink-300)' }}>{g.realm}</span>
                <span className="w-10 text-right shrink-0 font-mono" style={{ color: 'var(--ink-100)' }}>
                  {g.count}人
                </span>
                <div className="flex-1 h-3 rounded-full" style={{ background: 'rgba(13,17,23,0.5)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: barColors[i % barColors.length] }}
                  />
                </div>
                <span className="w-16 text-right shrink-0 font-mono" style={{ color: 'var(--ink-200)' }}>
                  {g.power.toLocaleString()}
                </span>
              </div>
            );
          })}
          {summary.byRealm.length === 0 && (
            <div className="text-xs italic" style={{ color: 'var(--ink-400)' }}>暂无弟子</div>
          )}
        </div>
      </Card>

      {/* 最强弟子 Top5 */}
      <Card title="最强弟子 Top 5" icon={<Trophy size={14} className="text-yellow-400/60" strokeWidth={1.8} />}>
        <div className="space-y-1">
          {summary.topDisciples.map((d, i) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
              style={{ background: i === 0 ? 'rgba(251,191,36,0.08)' : 'transparent' }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono" style={{ color: i === 0 ? 'var(--gold-200)' : 'var(--ink-400)', width: 16 }}>
                  {i + 1}
                </span>
                <span style={{ color: 'var(--ink-100)' }}>{d.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--ink-400)' }}>
                  {d.realm}·{d.status}
                </span>
              </div>
              <span className="font-mono" style={{ color: 'var(--gold-200)' }}>
                {d.power.toLocaleString()}
              </span>
            </div>
          ))}
          {summary.topDisciples.length === 0 && (
            <div className="text-xs italic" style={{ color: 'var(--ink-400)' }}>暂无弟子</div>
          )}
        </div>
      </Card>
    </div>
  );
};