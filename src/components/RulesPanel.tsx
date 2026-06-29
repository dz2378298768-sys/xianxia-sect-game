import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScrollText, Settings, Check, Users, UserPlus } from 'lucide-react';
import { RealmNames, RealmOrder } from '@/types/disciple';
import type { Realm } from '@/types/disciple';

type RuleType = 'servantToOuter' | 'outerToInner' | 'innerToCore' | 'coreToElder' | 'recruitment';

const RuleLabels: Record<RuleType, { from: string; to: string }> = {
  recruitment: { from: '招收', to: '弟子' },
  servantToOuter: { from: '杂役', to: '外门' },
  outerToInner: { from: '外门', to: '内门' },
  innerToCore: { from: '内门', to: '核心' },
  coreToElder: { from: '核心', to: '长老' },
};

export const RulesPanel: React.FC = () => {
  const { promotionRules, updatePromotionRules } = useGameStore();
  const [editingRule, setEditingRule] = useState<RuleType | null>(null);
  
  const [editForm, setEditForm] = useState({
    minContribution: 0,
    minRootBone: 0,
    enableExceptional: false,
    exceptionalThreshold: 0,
    minRealm: 'foundation' as Realm,
    requireElderRecommendation: false,
    // 招收规则
    minSpiritRhythm: 40,
    minConstitution: 40,
    minDaoFate: 40,
    recruitmentExceptional: 60,
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
        requireElderRecommendation: false,
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
        requireElderRecommendation: current.requireElderRecommendation || false,
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
          requireElderRecommendation: editForm.requireElderRecommendation,
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
              {ruleType === 'innerToCore' && (
                <div className="flex justify-between">
                  <span className="text-sect-jade/60">长老推荐</span>
                  <span className={rule.requireElderRecommendation ? 'text-green-400' : 'text-sect-jade/40'}>
                    {rule.requireElderRecommendation ? '需要' : '不需要'}
                  </span>
                </div>
              )}
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
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sect-jade/80">根骨要求</span>
                  <span className="text-sect-gold">{editForm.minRootBone}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editForm.minRootBone}
                  onChange={e => setEditForm({ ...editForm, minRootBone: parseInt(e.target.value) })}
                  className="w-full h-2 bg-sect-ink-light rounded-lg appearance-none cursor-pointer accent-sect-gold"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sect-jade/80">灵根要求</span>
                  <span className="text-sect-gold">{editForm.minSpiritRhythm}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editForm.minSpiritRhythm}
                  onChange={e => setEditForm({ ...editForm, minSpiritRhythm: parseInt(e.target.value) })}
                  className="w-full h-2 bg-sect-ink-light rounded-lg appearance-none cursor-pointer accent-sect-gold"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sect-jade/80">体质要求</span>
                  <span className="text-sect-gold">{editForm.minConstitution}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editForm.minConstitution}
                  onChange={e => setEditForm({ ...editForm, minConstitution: parseInt(e.target.value) })}
                  className="w-full h-2 bg-sect-ink-light rounded-lg appearance-none cursor-pointer accent-sect-gold"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sect-jade/80">道心要求</span>
                  <span className="text-sect-gold">{editForm.minDaoFate}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editForm.minDaoFate}
                  onChange={e => setEditForm({ ...editForm, minDaoFate: parseInt(e.target.value) })}
                  className="w-full h-2 bg-sect-ink-light rounded-lg appearance-none cursor-pointer accent-sect-gold"
                />
              </div>
              
              <div className="pt-4 border-t border-sect-gold/20">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sect-jade/80">破例阈值（任一属性达标即可）</span>
                  <span className="text-purple-400">{editForm.recruitmentExceptional}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={editForm.recruitmentExceptional}
                  onChange={e => setEditForm({ ...editForm, recruitmentExceptional: parseInt(e.target.value) })}
                  className="w-full h-2 bg-sect-ink-light rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>
            </>
          )}
          
          {editingRule === 'servantToOuter' && (
            <>
              <div>
                <label className="block text-sm text-sect-jade/60 mb-1">最低贡献点</label>
                <input
                  type="number"
                  value={editForm.minContribution}
                  onChange={e => setEditForm({ ...editForm, minContribution: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded bg-sect-ink-light border border-sect-gold/20 text-sect-jade"
                />
              </div>
              <div>
                <label className="block text-sm text-sect-jade/60 mb-1">最低根骨</label>
                <input
                  type="number"
                  value={editForm.minRootBone}
                  onChange={e => setEditForm({ ...editForm, minRootBone: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded bg-sect-ink-light border border-sect-gold/20 text-sect-jade"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableExceptional"
                  checked={editForm.enableExceptional}
                  onChange={e => setEditForm({ ...editForm, enableExceptional: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="enableExceptional" className="text-sm text-sect-jade">启用破格录取</label>
              </div>
              {editForm.enableExceptional && (
                <div>
                  <label className="block text-sm text-sect-jade/60 mb-1">破格门槛（根骨）</label>
                  <input
                    type="number"
                    value={editForm.exceptionalThreshold}
                    onChange={e => setEditForm({ ...editForm, exceptionalThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded bg-sect-ink-light border border-sect-gold/20 text-sect-jade"
                  />
                </div>
              )}
            </>
          )}
          
          {(editingRule === 'outerToInner' || editingRule === 'innerToCore' || editingRule === 'coreToElder') && (
            <>
              <div>
                <label className="block text-sm text-sect-jade/60 mb-1">最低境界</label>
                <select
                  value={editForm.minRealm}
                  onChange={e => setEditForm({ ...editForm, minRealm: e.target.value as Realm })}
                  className="w-full px-3 py-2 rounded bg-sect-ink-light border border-sect-gold/20 text-sect-jade"
                >
                  {RealmOrder.map(realm => (
                    <option key={realm} value={realm}>{RealmNames[realm]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-sect-jade/60 mb-1">最低贡献点</label>
                <input
                  type="number"
                  value={editForm.minContribution}
                  onChange={e => setEditForm({ ...editForm, minContribution: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded bg-sect-ink-light border border-sect-gold/20 text-sect-jade"
                />
              </div>
              {editingRule === 'innerToCore' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requireElderRecommendation"
                    checked={editForm.requireElderRecommendation}
                    onChange={e => setEditForm({ ...editForm, requireElderRecommendation: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="requireElderRecommendation" className="text-sm text-sect-jade">需要长老推荐</label>
                </div>
              )}
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
