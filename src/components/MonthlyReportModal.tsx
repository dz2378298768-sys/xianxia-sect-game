import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp, TrendingDown, Users, Sparkles,
  Star, CheckCircle, XCircle
} from 'lucide-react';

export const MonthlyReportModal: React.FC = () => {
  const { monthlyReport, showReport, dismissReport } = useGameStore();

  if (!monthlyReport) return null;

  const totalIncome = monthlyReport.spiritStoneIncome.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = monthlyReport.spiritStoneExpense.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const successBreakthroughs = monthlyReport.breakthroughs.filter(b => b.success);
  const failedBreakthroughs = monthlyReport.breakthroughs.filter(b => !b.success);

  return (
    <Modal
      isOpen={showReport}
      onClose={dismissReport}
      title={`月度简报 · 第 ${monthlyReport.date.year} 年 ${monthlyReport.date.month} 月`}
      size="lg"
    >
      <div className="space-y-2">
        {/* 概览行：收入/支出/声望 横排紧凑 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="text-green-400" size={12} />
              <span className="text-[10px] text-sect-jade/60">收入</span>
            </div>
            <div className="font-display text-sm text-green-400">+{totalIncome}</div>
          </div>
          <div className="text-center px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="text-red-400" size={12} />
              <span className="text-[10px] text-sect-jade/60">支出</span>
            </div>
            <div className="font-display text-sm text-red-400">-{totalExpense}</div>
          </div>
          <div className="text-center px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center justify-center gap-1">
              <Star className="text-yellow-400" size={12} />
              <span className="text-[10px] text-sect-jade/60">声望</span>
            </div>
            <div className={`font-display text-sm ${monthlyReport.reputationChange >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {monthlyReport.reputationChange >= 0 ? '+' : ''}{monthlyReport.reputationChange}
            </div>
          </div>
        </div>

        {/* 新入弟子 */}
        {monthlyReport.newDisciples.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <Users size={12} />
              新入弟子 ({monthlyReport.newDisciples.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {monthlyReport.newDisciples.map(d => (
                <Badge key={d.id} variant="herb">
                  {d.name} · {d.status}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 突破记录 */}
        {monthlyReport.breakthroughs.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <Sparkles size={12} />
              突破记录 ({monthlyReport.breakthroughs.length})
            </h3>
            <div className="space-y-1">
              {successBreakthroughs.map((b, i) => (
                <div key={`success-${i}`} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-500/10">
                  <CheckCircle size={12} className="text-green-400 shrink-0" />
                  <span className="text-sect-jade/80">
                    <span className="text-sect-gold">{b.discipleName}</span> 突破至 {b.to}
                  </span>
                </div>
              ))}
              {failedBreakthroughs.map((b, i) => (
                <div key={`fail-${i}`} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-500/10">
                  <XCircle size={12} className="text-red-400 shrink-0" />
                  <span className="text-sect-jade/80">
                    <span className="text-sect-jade">{b.discipleName}</span> 突破 {b.to} 失败
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 晋升记录 */}
        {monthlyReport.promotions.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <Users size={12} />
              晋升记录 ({monthlyReport.promotions.length})
            </h3>
            <div className="space-y-1">
              {monthlyReport.promotions.map((p, i) => (
                <div key={i} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/10">
                  <Badge variant="spirit">{p.to}</Badge>
                  <span className="text-sect-jade/80">
                    <span className="text-sect-gold">{p.discipleName}</span> 从 {p.from} 晋升
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 收支明细 — 左右双列紧凑 */}
        {monthlyReport.spiritStoneIncome.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 text-xs">收支明细</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="text-sect-jade/60 text-[10px] mb-0.5">收入</div>
                {monthlyReport.spiritStoneIncome.map((item, i) => (
                  <div key={i} className="flex justify-between text-sect-jade/80">
                    <span className="truncate">{item.source}</span>
                    <span className="text-green-400 ml-1 shrink-0">+{item.amount}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                <div className="text-sect-jade/60 text-[10px] mb-0.5">支出</div>
                {monthlyReport.spiritStoneExpense.map((item, i) => (
                  <div key={i} className="flex justify-between text-sect-jade/80">
                    <span className="truncate">{item.source}</span>
                    <span className="text-red-400 ml-1 shrink-0">-{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部汇总 + 按钮 */}
        <div className="flex items-center justify-between pt-1.5 border-t border-sect-gold/10">
          <div className="text-sect-jade/60 text-xs">
            净收益：
            <span className={`font-display ml-1 ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netIncome >= 0 ? '+' : ''}{netIncome}
            </span>
          </div>
          <Button onClick={dismissReport} className="text-xs px-3 py-1">
            知道了
          </Button>
        </div>
      </div>
    </Modal>
  );
};
