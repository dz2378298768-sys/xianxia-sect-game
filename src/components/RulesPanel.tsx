import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScrollText, Settings, Check, Users, UserPlus } from 'lucide-react';
import { RealmNames, RealmOrder, getRealmDisplay } from '@/types/disciple';
import type { Realm } from '@/types/disciple';

/** 统一的滑条组件 */
const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
  className?: string;
  colorClass?: string;
  markerLabels?: string[];
}> = ({ label, value, min, max, step = 1, onChange, unit, className = '', colorClass = '', markerLabels }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`slider-field ${className}`}>
      <div className="slider-field-header">
        <span className="slider-field-label">{label}</span>
        <span className={`slider-field-value ${colorClass}`}>
          {markerLabels ? markerLabels[value] ?? value : value}
          {unit && !markerLabels && <span className="slider-field-unit">{unit}</span>}
        </span>
      </div>
      <div className="slider-field-track-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className={`slider-field-input ${colorClass}`}
          style={{ '--slider-pct': `${pct}%` } as React.CSSProperties}
        />
        <div className="slider-field-track">
          <div className={`slider-field-fill ${colorClass}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {markerLabels && (
        <div className="slider-field-markers">
          {markerLabels.map((l, i) => (
            <span key={i} className={`slider-field-marker ${i === value ? 'is-active' : ''} ${colorClass}`}>
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

type RuleType = 'servantToOuter' | 'outerToInner' | 'innerToCore' | 'coreToElder' | 'recruitment';

const RuleLabels: Record<RuleType, { from: string; to: string }> = {
  recruitment: { from: '招收', to: '弟子' },
  servantToOuter: { from: '杂役', to: '外门' },
  outerToInner: { from: '外门', to: '内门' },
  innerToCore: { from: '内门', to: '核心' },
  coreToElder: { from: '核心', to: '长老' },
};

export const RulesPanel: React.FC = () => {
  const { promotionRules, updatePromotionRules, disciples, appointElder, autoAppointElder, setAutoAppointElder } = useGameStore();
  const [editingRule, setEditingRule] = useState<RuleType | null>(null);

  const [editForm, setEditForm] = useState({
    minContribution: 0,
    minRootBone: 0,
    enableExceptional: false,
    exceptionalThreshold: 0,
    minRealm: 'foundation' as Realm,
    // 招收规则
    minSpiritRhythm: 60,
    minConstitution: 60,
    minDaoFate: 60,
    recruitmentExceptional: 80,
  });

  const handleEdit = (rule: RuleType) => {
    const current = promotionRules[rule] as any;
    if (rule === 'recruitment') {
      setEditForm({
        minContribution: 0,
        minRootBone: current.minRootBone || 40,
        enableExceptional: false,
        exceptionalThreshold: 0,
        minRealm: 'foundation',
        minSpiritRhythm: current.minSpiritRhythm || 40,
        minConstitution: current.minConstitution || 40,
        minDaoFate: current.minDaoFate || 40,
        recruitmentExceptional: current.exceptionalThreshold || 60,
      });
    } else {
      setEditForm({
        minContribution: current.minContribution || 0,
        minRootBone: current.minRootBone || 0,
        enableExceptional: current.enableExceptional || false,
        exceptionalThreshold: current.exceptionalThreshold || 0,
        minRealm: current.minRealm || 'foundation',
        minSpiritRhythm: 40,
        minConstitution: 40,
        minDaoFate: 40,
        recruitmentExceptional: 60,
      });
    }
    setEditingRule(rule);
  };
  
  const handleSave = () => {
    if (!editingRule) return;
    
    if (editingRule === 'recruitment') {
      updatePromotionRules({
        recruitment: {
          minRootBone: editForm.minRootBone,
          minSpiritRhythm: editForm.minSpiritRhythm,
          minConstitution: editForm.minConstitution,
          minDaoFate: editForm.minDaoFate,
          exceptionalThreshold: editForm.recruitmentExceptional,
        },
      });
    } else if (editingRule === 'servantToOuter') {
      updatePromotionRules({
        servantToOuter: {
          minContribution: editForm.minContribution,
          minRootBone: editForm.minRootBone,
          enableExceptional: editForm.enableExceptional,
          exceptionalThreshold: editForm.exceptionalThreshold,
        },
      });
    } else if (editingRule === 'outerToInner') {
      updatePromotionRules({
        outerToInner: {
          minRealm: editForm.minRealm,
          minContribution: editForm.minContribution,
          minSkill: 0,
        },
      });
    } else if (editingRule === 'innerToCore') {
      updatePromotionRules({
        innerToCore: {
          minRealm: editForm.minRealm,
          minContribution: editForm.minContribution,
        },
      });
    } else if (editingRule === 'coreToElder') {
      updatePromotionRules({
        coreToElder: {
          minRealm: editForm.minRealm,
          minContribution: editForm.minContribution,
        },
      });
    }
    
    setEditingRule(null);
  };
  
  const renderRuleCard = (ruleType: RuleType) => {
    const rule = promotionRules[ruleType] as any;
    const label = RuleLabels[ruleType];
    
    // 招收规则特殊渲染
    if (ruleType === 'recruitment') {
      return (
        <div key={ruleType} className="p-4 rounded-lg bg-sect-ink-light/30 border border-sect-gold/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="gold">
                <Users size={12} className="mr-1" />
                弟子招收
              </Badge>
            </div>
            <button 
              onClick={() => handleEdit(ruleType)}
              className="p-1.5 rounded hover:bg-sect-gold/20 transition-colors cursor-pointer"
            >
              <Settings size={16} className="text-sect-jade/60 hover:text-sect-gold" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs text-sect-jade/50 mb-3">
              设置招收弟子的资质要求，四项全部达标直接收为外门弟子
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span className="text-sect-jade/60">根骨</span>
                <span className="text-sect-gold">{rule.minRootBone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">灵根</span>
                <span className="text-sect-gold">{rule.minSpiritRhythm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">体质</span>
                <span className="text-sect-gold">{rule.minConstitution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">道心</span>
                <span className="text-sect-gold">{rule.minDaoFate}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-sect-gold/10 mt-2">
              <div className="flex justify-between">
                <span className="text-sect-jade/60">破例阈值</span>
                <span className="text-sect-gold/80 text-xs">
                  任一属性 ≥ {rule.exceptionalThreshold} 可破例
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div key={ruleType} className="p-4 rounded-lg bg-sect-ink-light/30 border border-sect-gold/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">{label.from}</Badge>
            <span className="text-sect-jade/50">→</span>
            <Badge variant={ruleType === 'coreToElder' ? 'pill' : 'herb'}>{label.to}</Badge>
          </div>
          <button 
            onClick={() => handleEdit(ruleType)}
            className="p-1.5 rounded hover:bg-sect-gold/20 transition-colors cursor-pointer"
          >
            <Settings size={16} className="text-sect-jade/60 hover:text-sect-gold" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {ruleType === 'servantToOuter' && (
            <>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">最低贡献点</span>
                <span className="text-sect-jade">{rule.minContribution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">最低根骨</span>
                <span className="text-sect-jade">{rule.minRootBone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">破格录取</span>
                <span className={rule.enableExceptional ? 'text-green-400' : 'text-sect-jade/40'}>
                  {rule.enableExceptional ? '已启用' : '未启用'}
                </span>
              </div>
              {rule.enableExceptional && (
                <div className="flex justify-between pl-4">
                  <span className="text-sect-jade/50 text-xs">破格门槛</span>
                  <span className="text-sect-gold/80 text-xs">
                    根骨 ≥ {rule.exceptionalThreshold}
                  </span>
                </div>
              )}
            </>
          )}
          {(ruleType === 'outerToInner' || ruleType === 'innerToCore' || ruleType === 'coreToElder') && (
            <>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">最低境界</span>
                <span className="text-sect-jade">
                  {RealmNames[rule.minRealm as keyof typeof RealmNames]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sect-jade/60">最低贡献点</span>
                <span className="text-sect-jade">{rule.minContribution}</span>
              </div>
              {ruleType === 'coreToElder' && (
                <div className="text-xs text-sect-jade/50 mt-2">
                  需玩家手动任命
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gold-gradient">门规戒律</h1>
        <p className="text-sect-jade/60 text-sm mt-1">
          制定宗门规则，让弟子自动晋升发展
        </p>
      </div>
      
      <Card title="弟子招收规则" icon={<UserPlus size={18} />}>
        <div className="space-y-4">
          {renderRuleCard('recruitment')}
        </div>
      </Card>
      
      <Card title="晋升规则" icon={<ScrollText size={18} />}>
        <div className="space-y-4">
          {renderRuleCard('servantToOuter')}
          {renderRuleCard('outerToInner')}
          {renderRuleCard('innerToCore')}
          {renderRuleCard('coreToElder')}
        </div>
      </Card>

      {/* 长老任命：手动任命符合条件核心弟子 + 自动任命开关 */}
      <Card title="长老任命" icon={<UserPlus size={18} />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/10">
            <div>
              <div className="text-sm text-sect-jade">每月自动任命</div>
              <div className="text-xs text-sect-jade/50 mt-1">
                开启后，每月自动将符合「核心升长老」条件的核心弟子任命为长老
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoAppointElder}
              onClick={() => setAutoAppointElder(!autoAppointElder)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoAppointElder ? 'bg-sect-gold' : 'bg-sect-ink-light'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoAppointElder ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <div className="text-sm text-sect-jade/80 mb-2">可任命的核心弟子</div>
            {(() => {
              const rule = promotionRules.coreToElder;
              const minRealmIdx = RealmOrder.indexOf(rule.minRealm);
              const eligible = disciples.filter(d =>
                d.status === 'core' &&
                RealmOrder.indexOf(d.realm) >= minRealmIdx &&
                d.contributionPoints >= rule.minContribution,
              );
              if (eligible.length === 0) {
                return (
                  <div className="text-xs text-sect-jade/50 text-center py-4 rounded-lg bg-sect-ink-light/20">
                    暂无符合条件的核心弟子
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {eligible.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-sect-ink-light/30 border border-sect-gold/10">
                      <div className="text-sm">
                        <span className="text-sect-jade font-medium">{d.name}</span>
                        <span className="text-sect-jade/50 ml-2">{getRealmDisplay(d)}</span>
                        <span className="text-sect-gold/70 ml-2">贡献 {d.contributionPoints}</span>
                      </div>
                      <Button
                        variant="gold"
                        onClick={() => appointElder(d.id)}
                        className="!py-1 !px-3 text-xs"
                      >
                        任命长老
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
      
      <Modal
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        title={editingRule === 'recruitment' ? '弟子招收规则' : `晋升规则：${editingRule ? RuleLabels[editingRule].from + ' → ' + RuleLabels[editingRule].to : ''}`}
        size="md"
      >
        <div className="space-y-4">
          {editingRule === 'recruitment' && (
            <>
              <div className="text-sm text-sect-jade/60 mb-4">
                设置招收弟子的资质要求。四项属性全部达到要求可收为外门弟子，否则为杂役弟子。
                若任一属性超过「破例阈值」，即使其他属性未达标也可收为外门弟子。
              </div>
              <SliderField
                label="根骨要求"
                value={editForm.minRootBone}
                min={0}
                max={100}
                onChange={v => setEditForm({ ...editForm, minRootBone: v })}
              />
              <SliderField
                label="灵根要求"
                value={editForm.minSpiritRhythm}
                min={0}
                max={100}
                onChange={v => setEditForm({ ...editForm, minSpiritRhythm: v })}
              />
              <SliderField
                label="体质要求"
                value={editForm.minConstitution}
                min={0}
                max={100}
                onChange={v => setEditForm({ ...editForm, minConstitution: v })}
              />
              <SliderField
                label="道心要求"
                value={editForm.minDaoFate}
                min={0}
                max={100}
                onChange={v => setEditForm({ ...editForm, minDaoFate: v })}
              />
              <div className="mt-4 pt-4 border-t border-sect-gold/20">
                <SliderField
                  label="破例阈值（任一属性达标即可）"
                  value={editForm.recruitmentExceptional}
                  min={50}
                  max={100}
                  colorClass="is-purple"
                  onChange={v => setEditForm({ ...editForm, recruitmentExceptional: v })}
                />
              </div>
            </>
          )}
          
          {editingRule === 'servantToOuter' && (
            <>
              <div className="text-sm text-sect-jade/60 mb-3">
                设置杂役晋升外门弟子的条件
              </div>
              <SliderField
                label="最低贡献点"
                value={editForm.minContribution}
                min={0}
                max={500}
                step={10}
                unit=" 点"
                onChange={v => setEditForm({ ...editForm, minContribution: v })}
              />
              <SliderField
                label="最低根骨"
                value={editForm.minRootBone}
                min={0}
                max={100}
                unit=""
                onChange={v => setEditForm({ ...editForm, minRootBone: v })}
              />
              <div className="slider-field">
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editForm.enableExceptional}
                    onClick={() => setEditForm({ ...editForm, enableExceptional: !editForm.enableExceptional })}
                    className={`slider-switch ${editForm.enableExceptional ? 'is-on' : ''}`}
                  >
                    <span className="slider-switch-knob" />
                  </button>
                  <span className="text-sm text-sect-jade">启用破格录取</span>
                </div>
                <div className="text-xs text-sect-jade/40 mt-1">
                  若根骨超过破格门槛，即使贡献点不足也可晋升
                </div>
              </div>
              {editForm.enableExceptional && (
                <SliderField
                  label="破格门槛（根骨）"
                  value={editForm.exceptionalThreshold}
                  min={0}
                  max={100}
                  colorClass="is-purple"
                  onChange={v => setEditForm({ ...editForm, exceptionalThreshold: v })}
                />
              )}
            </>
          )}
          
          {(editingRule === 'outerToInner' || editingRule === 'innerToCore' || editingRule === 'coreToElder') && (
            <>
              <div className="text-sm text-sect-jade/60 mb-3">
                {editingRule === 'outerToInner' && '外门弟子晋升内门弟子条件'}
                {editingRule === 'innerToCore' && '内门弟子晋升核心弟子条件'}
                {editingRule === 'coreToElder' && '核心弟子晋升长老条件'}
              </div>
              <SliderField
                label="最低境界"
                value={RealmOrder.indexOf(editForm.minRealm)}
                min={0}
                max={RealmOrder.length - 1}
                markerLabels={RealmOrder.map(r => RealmNames[r])}
                colorClass="is-realm"
                onChange={v => setEditForm({ ...editForm, minRealm: RealmOrder[v] as Realm })}
              />
              <SliderField
                label="最低贡献点"
                value={editForm.minContribution}
                min={0}
                max={editingRule === 'outerToInner' ? 1000 : editingRule === 'innerToCore' ? 2000 : 5000}
                step={10}
                unit=" 点"
                onChange={v => setEditForm({ ...editForm, minContribution: v })}
              />
            </>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="ghost" onClick={() => setEditingRule(null)} className="flex-1">
              取消
            </Button>
            <Button variant="gold" onClick={handleSave} className="flex-1">
              <Check size={16} className="mr-1" />
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
