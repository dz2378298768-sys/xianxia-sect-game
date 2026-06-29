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
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <TrendingUp className="mx-auto text-green-400 mb-1" size={24} />
            <div className="text-xs text-sect-jade/60">灵石收入</div>
            <div className="font-display text-lg text-green-400">+{totalIncome}</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <TrendingDown className="mx-auto text-red-400 mb-1" size={24} />
            <div className="text-xs text-sect-jade/60">灵石支出</div>
            <div className="font-display text-lg text-red-400">-{totalExpense}</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Star className="mx-auto text-yellow-400 mb-1" size={24} />
            <div className="text-xs text-sect-jade/60">声望变化</div>
            <div className={`font-display text-lg ${monthlyReport.reputationChange >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {monthlyReport.reputationChange >= 0 ? '+' : ''}{monthlyReport.reputationChange}
            </div>
          </div>
        </div>
        
        {monthlyReport.newDisciples.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2">
              <Users size={18} />
              新入弟子 ({monthlyReport.newDisciples.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {monthlyReport.newDisciples.map(d => (
                <Badge key={d.id} variant="herb">
                  {d.name} · {d.status}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {monthlyReport.breakthroughs.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2">
              <Sparkles size={18} />
              突破记录 ({monthlyReport.breakthroughs.length})
            </h3>
            <div className="space-y-2">
              {successBreakthroughs.map((b, i) => (
                <div key={`success-${i}`} className="flex items-center gap-2 text-sm p-2 rounded bg-green-500/10">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-sect-jade/80">
                    <span className="text-sect-gold">{b.discipleName}</span> 成功突破至 {b.to}
                  </span>
                </div>
              ))}
              {failedBreakthroughs.map((b, i) => (
                <div key={`fail-${i}`} className="flex items-center gap-2 text-sm p-2 rounded bg-red-500/10">
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-sect-jade/80">
                    <span className="text-sect-jade">{b.discipleName}</span> 突破 {b.to} 失败
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {monthlyReport.promotions.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2">
              <Users size={18} />
              晋升记录 ({monthlyReport.promotions.length})
            </h3>
            <div className="space-y-2">
              {monthlyReport.promotions.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-purple-500/10">
                  <Badge variant="spirit">{p.to}</Badge>
                  <span className="text-sect-jade/80">
                    <span className="text-sect-gold">{p.discipleName}</span> 从 {p.from} 晋升
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {monthlyReport.spiritStoneIncome.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-2 text-sm">收支明细</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-sect-jade/60 text-xs mb-1">收入项</div>
                {monthlyReport.spiritStoneIncome.map((item, i) => (
                  <div key={i} className="flex justify-between text-sect-jade/80">
                    <span>{item.source}</span>
                    <span className="text-green-400">+{item.amount}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-sect-jade/60 text-xs mb-1">支出项</div>
                {monthlyReport.spiritStoneExpense.map((item, i) => (
                  <div key={i} className="flex justify-between text-sect-jade/80">
                    <span>{item.source}</span>
                    <span className="text-red-400">-{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t border-sect-gold/10">
          <div className="text-sect-jade/60 text-sm">
            本月净收益：
            <span className={`font-display ml-2 ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netIncome >= 0 ? '+' : ''}{netIncome} 灵石
            </span>
          </div>
          <Button onClick={dismissReport}>
            知道了
          </Button>
        </div>
      </div>
    </Modal>
  );
};
