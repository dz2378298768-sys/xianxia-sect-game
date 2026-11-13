import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import { useGameStore } from '@/store/gameStore';
import { SectIcon } from '@/components/icons/SectIcons';
import type { PanelType } from '@/store/uiStore';

const STEP_COUNT = 4;

/**
 * 月俸表：每名弟子每月按身份支出的灵石（已按月末 1/3 折算后的近似值）。
 * 实际结算是全宗汇总后再折算取整，因此单人数字会有零点几的误差。
 */
const MONTHLY_STIPEND = [
  { name: '杂役', value: '0.7' },
  { name: '外门', value: '1.7' },
  { name: '内门', value: '4' },
  { name: '核心', value: '8.3' },
  { name: '长老', value: '16.7' },
];

/**
 * 新手引导（分四步）
 * 开局时替代原先的单屏「灵石之道」说明：先讲目标与核心循环，再讲时间与事件节奏，
 * 然后是收支模型，最后给出可立即执行的开局三事。
 */
export const OpeningGuideModal: React.FC = () => {
  const { showOpeningGuide, setShowOpeningGuide, setActivePanel } = useUIStore();
  const spiritStones = useGameStore(s => s.spiritStones);
  const reputation = useGameStore(s => s.reputation);
  const discipleCount = useGameStore(s => s.disciples.length);
  const [step, setStep] = useState(0);

  // 引导期间由 Modal 统一暂停时间：开局不会边看说明边掉月结算
  if (!showOpeningGuide) return null;

  const close = () => {
    setStep(0);
    setShowOpeningGuide(false);
  };

  /** 关闭引导并直达对应面板 */
  const goPanel = (panel: PanelType) => {
    close();
    setActivePanel(panel);
  };

  const steps: React.ReactNode[] = [
    // 第 1 步：目标与核心循环
    <div className="space-y-3">
      <p className="text-[12.5px] text-[var(--ink-200)] leading-relaxed">
        你接手的是一座只有山门、没有弟子的破落小宗。
        目标只有一个：<b className="text-[var(--gold-200)]">把宗门一路晋升成仙门大宗</b>——弟子满堂、堂口林立、灵石不缺。
      </p>

      <div className="guide-loop">
        {[
          { icon: 'disciple', label: '招收弟子', desc: '人是一切根本' },
          { icon: 'building', label: '兴建堂口', desc: '堂口才有产出' },
          { icon: 'group', label: '分派差事', desc: '人尽其用' },
          { icon: 'gem', label: '月入灵石', desc: '滚起雪球' },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            <div className="guide-loop-node">
              <SectIcon name={item.icon as never} size={16} strokeWidth={1.8} />
              <span className="guide-loop-label">{item.label}</span>
              <span className="guide-loop-desc">{item.desc}</span>
            </div>
            {i < 3 && <span className="guide-loop-arrow">›</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="guide-stat-row">
        <div className="guide-stat">
          <span className="guide-stat-label">当前灵石</span>
          <b className="guide-stat-value">{spiritStones}</b>
        </div>
        <div className="guide-stat">
          <span className="guide-stat-label">当前声望</span>
          <b className="guide-stat-value">{reputation}</b>
        </div>
        <div className="guide-stat">
          <span className="guide-stat-label">门下弟子</span>
          <b className="guide-stat-value">{discipleCount}</b>
        </div>
      </div>

      <p className="guide-tip">
        灵石是唯一的硬通货，声望决定宗门能晋升到哪一级。两者都在
        <b className="text-[var(--gold-200)]"> 顶栏 </b>
        实时显示。
      </p>
    </div>,

    // 第 2 步：时间与事件节奏
    <div className="space-y-3">
      <p className="text-[12.5px] text-[var(--ink-200)] leading-relaxed">
        时间自动流逝：<b className="text-[var(--gold-200)]">1 秒 = 1 日，30 日 = 1 个月</b>。
        顶栏时间条右侧的金色圆键是暂停键——随时按，先想清楚再让它继续走。
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="guide-card">
          <div className="guide-card-title"><SectIcon name="trendUp" size={13} strokeWidth={1.9} />倍速</div>
          <p className="guide-card-text">1x / 2x / 4x 切换，节奏稳了再加速。时间条会显示当月走到了哪一天。</p>
        </div>
        <div className="guide-card">
          <div className="guide-card-title"><SectIcon name="scroll" size={13} strokeWidth={1.9} />月报</div>
          <p className="guide-card-text">每月结算弹出月报：收入、支出、弟子变化一目了然，是调经营的主要依据。</p>
        </div>
        <div className="guide-card">
          <div className="guide-card-title"><SectIcon name="crystal" size={13} strokeWidth={1.9} />事件</div>
          <p className="guide-card-text">异闻、建筑变故、弟子结交随时可能发生，不再只在月末。异闻先进「异闻」等待处理。</p>
        </div>
        <div className="guide-card">
          <div className="guide-card-title"><SectIcon name="warning" size={13} strokeWidth={1.9} />抉择</div>
          <p className="guide-card-text">遇到分支抉择时时间会自动暂停，选完才继续，不用担心错过。</p>
        </div>
      </div>

      <p className="guide-tip guide-tip-danger">
        经营失败会灭宗：连续赤字、负债过多，宗门会被逐出仙道。撑不住时先暂停，砍掉亏钱的堂口。
      </p>
    </div>,

    // 第 3 步：收支模型
    <div className="space-y-3">
      <p className="text-[12.5px] text-[var(--ink-200)] leading-relaxed">
        每个弟子每月都要发月俸，这是固定支出；建筑才是收入来源。先算清这笔账，再扩张。
      </p>

      <div className="guide-stipend">
        {MONTHLY_STIPEND.map(s => (
          <div key={s.name} className="guide-stipend-item">
            <span className="guide-stipend-name">{s.name}</span>
            <b className="guide-stipend-value">{s.value}</b>
            <span className="guide-stipend-unit">灵石/月</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {[
          { t: '堂口产出', d: '杂役堂、讲经堂等建筑每月产出灵石与材料，升级和派满人才能提升产量。' },
          { t: '附庸与试炼', d: '在「世界」附庸弱小宗门收上贡；派弟子参加月度试炼、宗门大比也能带回大量灵石与声望。' },
          { t: '坊市出货', d: '把富余的丹药、法器、符箓拿到坊市卖掉，周转现金流。' },
        ].map((row, i) => (
          <div key={row.t} className="guide-row">
            <span className="guide-row-index">{i + 1}</span>
            <div className="min-w-0">
              <div className="guide-row-title">{row.t}</div>
              <p className="guide-row-desc">{row.d}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="guide-tip">
        开局别急着铺满弟子：先让一座堂口跑出正收益，再拿利润去招人。正邪度也别乱掉——
        屠戮、辱他宗会招来正道联军，每年只自然回升 1 点。
      </p>
    </div>,

    // 第 4 步：开局三事
    <div className="space-y-3">
      <p className="text-[12.5px] text-[var(--ink-200)] leading-relaxed">
        前三步知道就够了，接下来按这三件事开局，宗门就能转起来。
      </p>

      <div className="space-y-2">
        <button className="guide-action" onClick={() => goPanel('disciples')}>
          <span className="guide-action-index">1</span>
          <span className="guide-action-body">
            <b className="guide-action-title">招收第一批弟子</b>
            <span className="guide-action-desc">在「弟子」面板招 2-3 名，够填满一座堂口即可</span>
          </span>
          <SectIcon name="arrowRight" size={14} strokeWidth={2} />
        </button>
        <button className="guide-action" onClick={() => goPanel('buildings')}>
          <span className="guide-action-index">2</span>
          <span className="guide-action-body">
            <b className="guide-action-title">建起能赚钱的堂口</b>
            <span className="guide-action-desc">优先建杂役堂这类能产灵石的堂口，看清每月产出与维护费再动工</span>
          </span>
          <SectIcon name="arrowRight" size={14} strokeWidth={2} />
        </button>
        <button className="guide-action" onClick={() => goPanel('affairs')}>
          <span className="guide-action-index">3</span>
          <span className="guide-action-body">
            <b className="guide-action-title">把弟子派上差事</b>
            <span className="guide-action-desc">空着的弟子不产灵石，分派到堂口后下个月就见收益</span>
          </span>
          <SectIcon name="arrowRight" size={14} strokeWidth={2} />
        </button>
      </div>

      <p className="guide-tip">
        主线任务会一路提示下一步该做什么，卡住时先看「任务」面板。
      </p>
    </div>,
  ];

  const isLast = step === STEP_COUNT - 1;

  return (
    <Modal
      isOpen={showOpeningGuide}
      onClose={close}
      title="宗门初立 · 引路篇"
      size="lg"
      footer={
        <div className="flex flex-col gap-2">
          {/* 步骤指示固定在底部，长页面也不影响点下一步 */}
          <div className="flex items-center gap-2">
            <span className="guide-step-badge">第 {step + 1} / {STEP_COUNT} 步</span>
            <div className="guide-step-dots">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`第 ${i + 1} 步`}
                  onClick={() => setStep(i)}
                  className={`guide-step-dot ${i === step ? 'guide-step-dot-active' : ''}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={close}
              className="text-[11px] text-[var(--ink-400)] hover:text-[var(--ink-200)] transition-colors"
            >
              跳过引导
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
                  上一步
                </Button>
              )}
              {isLast ? (
                <Button variant="gold" size="sm" onClick={close}>
                  开始经营
                </Button>
              ) : (
                <Button variant="gold" size="sm" onClick={() => setStep(s => Math.min(STEP_COUNT - 1, s + 1))}>
                  下一步
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {steps[step]}
      </div>
    </Modal>
  );
};
