import React, { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { computeSectCombatSummary } from '@/utils/gameLogic';
import { Sword, Shield, Star, Users, Building2, Trophy } from 'lucide-react';

/** 宗门战力统计面板 */
export const SectCombatPanel: React.FC = () => {
  const { disciples, buildings } = useGameStore();

  const summary = useMemo(() => computeSectCombatSummary(disciples, buildings), [disciples, buildings]);

  // 战力条颜色
  const barColors = [
    'linear-gradient(90deg, #f59e0b, #fbbf24)',
    'linear-gradient(90deg, #3b82f6, #60a5fa)',
    'linear-gradient(90deg, #10b981, #34d399)',
    'linear-gradient(90deg, #8b5cf6, #a78bfa)',
    'linear-gradient(90deg, #ef4444, #f87171)',
    'linear-gradient(90deg, #ec4899, #f472b6)',
  ];

  const maxPower = Math.max(...summary.byStatus.map(g => g.power), 1);

  return (
    <div className="space-y-4">
      {/* 总战力卡片 */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Sword size={20} className="text-red-400/50" strokeWidth={1.8} />
          <h2 className="font-display text-lg" style={{ color: 'var(--gold-200)' }}>宗门战力</h2>
        </div>

        {/* 总战力大数字 */}
        <div className="text-center py-4">
          <div className="text-[11px]" style={{ color: 'var(--ink-400)' }}>宗门总战力</div>
          <div className="font-display font-bold" style={{ fontSize: '36px', color: 'var(--gold-200)' }}>
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
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-blue-400/50" strokeWidth={1.8} />
          <h3 className="font-display text-sm" style={{ color: 'var(--gold-200)' }}>身份战力分布</h3>
        </div>
        <div className="space-y-2">
          {summary.byStatus.map((g, i) => {
            const pct = (g.power / maxPower) * 100;
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
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Star size={16} className="text-purple-400/50" strokeWidth={1.8} />
          <h3 className="font-display text-sm" style={{ color: 'var(--gold-200)' }}>境界战力分布</h3>
        </div>
        <div className="space-y-2">
          {summary.byRealm.map((g, i) => {
            const pct = (g.power / maxPower) * 100;
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
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-yellow-400/50" strokeWidth={1.8} />
          <h3 className="font-display text-sm" style={{ color: 'var(--gold-200)' }}>最强弟子 Top 5</h3>
        </div>
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