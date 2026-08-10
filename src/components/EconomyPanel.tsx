import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp, TrendingDown, Gem,
  AlertTriangle, Wallet, PiggyBank
} from 'lucide-react';
import { calculateBuildingMaintenance, calculateBuildingOutput } from '@/utils/gameLogic';
import { SectIcon } from '@/components/icons/SectIcons';
import { useDevice } from '@/hooks/useDevice';

export const EconomyPanel: React.FC = () => {
  const { isMobile, isCompact, isPortrait } = useDevice();
  const {
    spiritStones, buildings, disciples,
    herbInventory, ironInventory, paperInventory, spiritStoneHistory,
  } = useGameStore();

  const activeBuildings = buildings.filter(b => b.status === 'active');

  let totalSpiritStoneIncome = 0;
  let totalMaintenance = 0;
  let totalHerbIncome = 0;
  let totalIronIncome = 0;
  let totalPaperIncome = 0;

  const incomeDetails: { name: string; spiritStones: number }[] = [];
  const expenseDetails: { name: string; amount: number }[] = [];

  activeBuildings.forEach(building => {
    const assignedDisciples = disciples.filter(d => building.assignedDisciples.includes(d.id));
    const output = calculateBuildingOutput(building, assignedDisciples);
    const maintenance = calculateBuildingMaintenance(building);

    if (output.spiritStones > 0) {
      incomeDetails.push({
        name: building.name,
        spiritStones: output.spiritStones,
      });
      totalSpiritStoneIncome += output.spiritStones;
    }

    if (output.herbs > 0) {
      totalHerbIncome += output.herbs;
    }
    if (output.iron > 0) {
      totalIronIncome += output.iron;
    }
    if (output.paper > 0) {
      totalPaperIncome += output.paper;
    }

    totalMaintenance += maintenance;
    expenseDetails.push({ name: `${building.name}维护`, amount: maintenance });
  });
  
  const servantCount = disciples.filter(d => d.status === 'servant').length;
  const servantStipend = servantCount * 1;
  if (servantStipend > 0) {
    totalMaintenance += servantStipend;
    expenseDetails.push({ name: '杂役零花钱', amount: servantStipend });
  }
  
  const netIncome = totalSpiritStoneIncome - totalMaintenance;
  
  const getBankruptcyLevel = () => {
    if (spiritStones >= 0) return 0;
    if (spiritStones >= -50) return 1;
    if (spiritStones >= -200) return 2;
    return 3;
  };
  
  const bankruptcyLevel = getBankruptcyLevel();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-gold-gradient">经济收支</h1>
          <p className="text-sect-jade/60 text-sm mt-1">
            管理宗门灵石收支
          </p>
        </div>
      </div>
      
      {bankruptcyLevel > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle size={24} />
            <div>
              <div className="font-display font-medium">灵石告急！</div>
              <div className="text-sm text-red-400/80">
                {bankruptcyLevel === 1 && '建筑效率降低50%，请尽快增加收入或减少开支。'}
                {bankruptcyLevel === 2 && '债主上门风险增加，声望可能受损。'}
                {bankruptcyLevel >= 3 && '宗门运转困难，非核心建筑已自动关闭。'}
              </div>
            </div>
          </div>
        </Card>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Gem className="text-sect-spirit" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">灵石余额</div>
              <div className={`font-display text-xl ${spiritStones < 0 ? 'text-red-400' : 'text-sect-gold'}`}>
                {Math.floor(spiritStones)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">月收入</div>
              <div className="font-display text-xl text-green-400">
                +{totalSpiritStoneIncome}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <TrendingDown className="text-red-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">月支出</div>
              <div className="font-display text-xl text-red-400">
                -{totalMaintenance}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 近12月灵石余额折线图 */}
      <Card title="近12月灵石余额">
        {(() => {
          const data = spiritStoneHistory.slice(-12);
          if (data.length < 2) {
            return (
              <div className="text-sect-jade/50 text-sm text-center py-8">
                至少需要2个月数据才能绘制趋势图（当前 {data.length} 个月）
              </div>
            );
          }
          // 手机端大幅增加画布尺寸与字号，确保线条和刻度清晰可辨
          const H = isMobile ? (isPortrait ? 300 : 220) : 260;
          const fs = isMobile || isCompact ? 14 : 12;
          const fsX = isMobile || isCompact ? 13 : 11;
          const strokeW = isMobile || isCompact ? 3.5 : 2.5;
          const dotR = isMobile || isCompact ? 5 : 3.5;
          const padL = isMobile ? 72 : 64;
          const padB = isMobile ? 52 : 42;
          const W = 720;
          const padR = 20;
          const padT = 20;
          const innerW = W - padL - padR;
          const innerH = H - padT - padB;

          const allVals = data.map(d => d.spiritStones);
          let minV = Math.min(...allVals, 0);
          let maxV = Math.max(...allVals, 1);
          if (maxV === minV) maxV = minV + 1;
          const yOf = (v: number) => padT + innerH - ((v - minV) / (maxV - minV)) * innerH;
          const xOf = (i: number) => padL + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);

          const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.spiritStones).toFixed(1)}`).join(' ');
          const ticks = [0, 1, 2, 3, 4].map(k => minV + (k / 4) * (maxV - minV));

          return (
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: isMobile ? 380 : 480, height: H }} preserveAspectRatio="xMidYMid meet">
                {ticks.map((t, i) => (
                  <g key={i}>
                    <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)} stroke="rgba(212,175,55,0.1)" strokeWidth={1} />
                    <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" fontSize={fs} fill="rgba(212,210,180,0.6)">
                      {Math.round(t)}
                    </text>
                  </g>
                ))}
                {data.map((d, i) => (
                  <text key={i} x={xOf(i)} y={H - padB + 26} textAnchor="middle" fontSize={fsX} fill="rgba(212,210,180,0.6)">
                    {d.year}.{d.month}
                  </text>
                ))}
                <path d={path} fill="none" stroke="#d4af37" strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round" />
                {data.map((d, i) => (
                  <circle key={i} cx={xOf(i)} cy={yOf(d.spiritStones)} r={dotR} fill="#d4af37" />
                ))}
              </svg>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs text-sect-jade/70" style={{ fontSize: isMobile ? 13 : 12 }}>
                <span className="flex items-center gap-2">
                  <span style={{ display: 'inline-block', width: 20, height: 4, background: '#d4af37' }} />
                  灵石余额
                </span>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* 近12月月净收益折线图（单独一张，避免与余额数值差太大被压缩） */}
      <Card title="近12月月净收益">
        {(() => {
          const data = spiritStoneHistory.slice(-12);
          if (data.length < 2) {
            return (
              <div className="text-sect-jade/50 text-sm text-center py-8">
                至少需要2个月数据才能绘制趋势图（当前 {data.length} 个月）
              </div>
            );
          }
          const H = isMobile ? (isPortrait ? 280 : 200) : 240;
          const fs = isMobile || isCompact ? 14 : 12;
          const fsX = isMobile || isCompact ? 13 : 11;
          const strokeW = isMobile || isCompact ? 3.5 : 2.5;
          const dotR = isMobile || isCompact ? 5 : 3.5;
          const padL = isMobile ? 72 : 64;
          const padB = isMobile ? 52 : 42;
          const W = 720;
          const padR = 20;
          const padT = 20;
          const innerW = W - padL - padR;
          const innerH = H - padT - padB;

          const allVals = data.map(d => d.netIncome);
          let minV = Math.min(...allVals, 0);
          let maxV = Math.max(...allVals, 1);
          if (maxV === minV) maxV = minV + 1;
          const yOf = (v: number) => padT + innerH - ((v - minV) / (maxV - minV)) * innerH;
          const xOf = (i: number) => padL + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);

          const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.netIncome).toFixed(1)}`).join(' ');
          const ticks = [0, 1, 2, 3, 4].map(k => minV + (k / 4) * (maxV - minV));
          const zeroY = yOf(0);

          return (
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: isMobile ? 380 : 480, height: H }} preserveAspectRatio="xMidYMid meet">
                {ticks.map((t, i) => (
                  <g key={i}>
                    <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)} stroke="rgba(52,211,153,0.1)" strokeWidth={1} />
                    <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" fontSize={fs} fill="rgba(212,210,180,0.6)">
                      {Math.round(t)}
                    </text>
                  </g>
                ))}
                {minV < 0 && maxV > 0 && (
                  <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="rgba(212,210,180,0.45)" strokeWidth={1.2} strokeDasharray="5 4" />
                )}
                {data.map((d, i) => (
                  <text key={i} x={xOf(i)} y={H - padB + 26} textAnchor="middle" fontSize={fsX} fill="rgba(212,210,180,0.6)">
                    {d.year}.{d.month}
                  </text>
                ))}
                <path d={path} fill="none" stroke="#34d399" strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round" />
                {data.map((d, i) => (
                  <circle key={i} cx={xOf(i)} cy={yOf(d.netIncome)} r={dotR} fill={d.netIncome >= 0 ? '#34d399' : '#f87171'} />
                ))}
              </svg>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs text-sect-jade/70" style={{ fontSize: isMobile ? 13 : 12 }}>
                <span className="flex items-center gap-2">
                  <span style={{ display: 'inline-block', width: 20, height: 4, background: '#34d399' }} />
                  月净收益
                </span>
              </div>
            </div>
          );
        })()}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="收入明细">
          <div className="space-y-3">
            {incomeDetails.length === 0 ? (
              <div className="text-sect-jade/50 text-sm text-center py-4">
                暂无收入来源
              </div>
            ) : (
              incomeDetails.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-sect-gold/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-green-400/60" />
                    <span className="text-sect-jade/80 text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    {item.spiritStones > 0 && (
                      <div className="text-green-400 text-sm">+{item.spiritStones} 灵石</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
        
        <Card title="支出明细">
          <div className="space-y-3">
            {expenseDetails.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-sect-gold/5 last:border-0">
                <div className="flex items-center gap-2">
                  <PiggyBank size={16} className="text-red-400/60" />
                  <span className="text-sect-jade/80 text-sm">{item.name}</span>
                </div>
                <span className="text-red-400 text-sm">-{item.amount} 灵石</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      <Card title="资源库存">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 rounded-lg bg-sect-ink-light/30">
            <div className="text-sect-herb mb-1 flex justify-center">
              <SectIcon name="herb" size={28} strokeWidth={1.8} />
            </div>
            <div className="text-sect-jade/60 text-xs">灵草</div>
            <div className="font-display text-sect-herb-light">{herbInventory} 株</div>
            <div className="text-xs text-green-400 mt-1">+{totalHerbIncome}/月</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-sect-ink-light/30">
            <div className="mb-1 flex justify-center" style={{ color: 'var(--ink-200, #c8c8d0)' }}>
              <SectIcon name="sword" size={28} strokeWidth={1.8} />
            </div>
            <div className="text-sect-jade/60 text-xs">灵铁</div>
            <div className="font-display" style={{ color: 'var(--ink-100, #e0e0e8)' }}>{ironInventory} 块</div>
            <div className="text-xs text-green-400 mt-1">+{totalIronIncome}/月</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-sect-ink-light/30">
            <div className="text-sect-gold mb-1 flex justify-center">
              <SectIcon name="scrollText" size={28} strokeWidth={1.8} />
            </div>
            <div className="text-sect-jade/60 text-xs">符纸</div>
            <div className="font-display text-sect-gold">{paperInventory} 张</div>
            <div className="text-xs text-green-400 mt-1">+{totalPaperIncome}/月</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-sect-ink-light/30">
            <div className="text-sect-gold mb-1 flex justify-center">
              <SectIcon name="group" size={28} strokeWidth={1.8} />
            </div>
            <div className="text-sect-jade/60 text-xs">杂役弟子</div>
            <div className="font-display text-sect-jade">{servantCount} 人</div>
            <div className="text-xs text-red-400 mt-1">-{servantStipend}/月</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-sect-ink-light/30">
            <div className="text-sect-spirit mb-1 flex justify-center">
              <SectIcon name="building" size={28} strokeWidth={1.8} />
            </div>
            <div className="text-sect-jade/60 text-xs">启用建筑</div>
            <div className="font-display text-sect-jade">{activeBuildings.length} 座</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-sect-ink-light/30">
            <div className={`mb-1 flex justify-center ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <SectIcon name={netIncome >= 0 ? 'trendUp' : 'trendDown'} size={28} strokeWidth={1.8} />
            </div>
            <div className="text-sect-jade/60 text-xs">净收益</div>
            <div className={`font-display ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netIncome >= 0 ? '+' : ''}{netIncome}/月
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
