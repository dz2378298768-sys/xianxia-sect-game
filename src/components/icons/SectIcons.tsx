import React from 'react';

/**
 * 自定义 SVG 图标集 —— 水墨金墨描边风格
 * 所有图标 24x24 viewBox，stroke=currentColor，fill=none
 * 跨环境稳定显示，不依赖 emoji 字体
 */

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const baseProps = (size: number, className: string, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

// 山门 —— 山形+门洞
export const IconMountain: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M3 20 L9 8 L13 14 L16 9 L21 20 Z" />
    <path d="M10.5 20 L10.5 16 Q12 14.5 13.5 16 L13.5 20" />
    <circle cx="9" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

// 建造 —— 飞檐殿顶
export const IconBuilding: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M4 11 Q12 5 20 11" />
    <path d="M5 11 L5 18 L19 18 L19 11" />
    <path d="M9 18 L9 13 L15 13 L15 18" />
    <path d="M12 5 L12 3" />
    <path d="M11 3 L13 3" />
  </svg>
);

// 弟子 —— 人形
export const IconDisciple: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 20 Q5.5 14 12 14 Q18.5 14 18.5 20" />
  </svg>
);

// 修炼 —— 经卷+灵气
export const IconCultivate: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 5 Q5 4 6 4 L13 4 Q14 4 14 5 L14 19 Q14 20 13 20 L6 20 Q5 20 5 19 Z" />
    <path d="M14 6 L18 6 Q19 6 19 7 L19 18 Q19 19 18 19 L14 19" />
    <path d="M8 9 L11 9 M8 12 L11 12 M8 15 L11 15" />
  </svg>
);

// 库房 —— 箱匣
export const IconWarehouse: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M4 9 L12 4 L20 9 L20 20 L4 20 Z" />
    <path d="M9 20 L9 13 L15 13 L15 20" />
    <path d="M12 13 L12 16" />
  </svg>
);

// 宗门战 —— 交叉双剑
export const IconBattle: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M4 4 L14 14" />
    <path d="M4 4 L4 7 L7 7 Z" fill="currentColor" />
    <path d="M20 4 L10 14" />
    <path d="M20 4 L20 7 L17 7 Z" fill="currentColor" />
    <path d="M9 15 L6 18 M15 15 L18 18" />
    <circle cx="12" cy="14" r="1.2" />
  </svg>
);

// 世界 —— 罗盘/山河图
export const IconWorld: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12 L20.5 12" />
    <path d="M12 3.5 Q7 12 12 20.5 Q17 12 12 3.5" />
    <path d="M6 7.5 Q12 9 18 7.5" />
    <path d="M6 16.5 Q12 15 18 16.5" />
  </svg>
);

// 下月/推进 —— 月相+箭头
export const IconNextMonth: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M14 4 Q9 4.5 7 9 Q5 13.5 7.5 18 Q10.5 21 15 20.5" />
    <path d="M12 12 L19 12 M16 9 L19 12 L16 15" />
  </svg>
);

// 宗门信息/统计 —— 卷轴
export const IconScroll: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M6 4 L16 4 Q18 4 18 6 L18 18 Q18 20 16 20 L8 20" />
    <path d="M6 4 Q4 4 4 6 L4 18 Q4 20 6 20" />
    <path d="M8 8 L15 8 M8 11 L15 11 M8 14 L13 14" />
  </svg>
);

// 任务/事件 —— 雷符
export const IconTalisman: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M13 3 L6 13 L11 13 L10 21 L17 11 L12 11 Z" />
  </svg>
);

// 关闭 —— 叉
export const IconClose: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 2 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M6 6 L18 18 M18 6 L6 18" />
  </svg>
);

// 箭头 —— 前往
export const IconArrowRight: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 12 L19 12 M13 6 L19 12 L13 18" />
  </svg>
);

// 返回 —— 左箭头
export const IconBack: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M19 12 L5 12 M11 6 L5 12 L11 18" />
  </svg>
);

// 预览 —— 眼睛
export const IconEye: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M2 12 Q6 5 12 5 Q18 5 22 12 Q18 19 12 19 Q6 19 2 12 Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// 设置/规则 —— 齿轮
export const IconGear: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19" />
  </svg>
);

// 灵石/钻石 —— 菱形多面
export const IconGem: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M6 4 L18 4 L21 9 L12 21 L3 9 Z" />
    <path d="M3 9 L21 9" />
    <path d="M9 4 L12 9 L15 4" />
    <path d="M12 9 L12 21" />
  </svg>
);

// 贡献/灵球 —— 水晶球+底座
export const IconCrystal: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="9" r="5" />
    <path d="M7 18 L17 18 M8 18 L7 21 L17 21 L16 18" />
    <path d="M9.5 7 Q12 6 14.5 7" />
    <circle cx="10" cy="8" r="0.6" fill="currentColor" />
  </svg>
);

// 丹药 —— 胶囊
export const IconPill: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 12 Q5 5 12 5 Q19 5 19 12 Q19 19 12 19 Q5 19 5 12 Z" />
    <path d="M5 12 L19 12" />
    <path d="M8 9 Q9 8 10.5 8 M8 15 Q9 16 10.5 16" />
  </svg>
);

// 书本 —— 翻开经书
export const IconBook: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 6 Q8 4 4 5 L4 19 Q8 18 12 20 Q16 18 20 19 L20 5 Q16 4 12 6 Z" />
    <path d="M12 6 L12 20" />
    <path d="M6 9 L9 9 M6 12 L9 12 M15 9 L18 9 M15 12 L18 12" />
  </svg>
);

// 提示灯 —— 灯泡
export const IconBulb: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M9 17 L9 18 Q9 21 12 21 Q15 21 15 18 L15 17" />
    <path d="M7 14 Q5 11 6 8 Q8 4 12 4 Q16 4 18 8 Q19 11 17 14 L7 14 Z" />
    <path d="M10 14 L10 17 M14 14 L14 17" />
    <path d="M12 7 L12 11" />
  </svg>
);

// 警告 —— 三角+叹号
export const IconWarning: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 3 L22 20 L2 20 Z" />
    <path d="M12 9 L12 14" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" />
  </svg>
);

// 灵草 —— 茎+三叶
export const IconHerb: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 21 L12 11" />
    <path d="M12 13 Q7 11 6 6 Q11 7 12 11" />
    <path d="M12 11 Q17 9 18 4 Q13 5 12 9" />
    <path d="M9 21 L15 21" />
  </svg>
);

// 灯笼/繁荣
export const IconLantern: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M9 4 L15 4 M12 2 L12 4" />
    <path d="M7 6 Q7 4 9 4 L15 4 Q17 4 17 6 L17 16 Q17 18 15 18 L9 18 Q7 18 7 16 Z" />
    <path d="M7 10 L17 10" />
    <path d="M9 18 L9 21 M15 18 L15 21 M9 21 L15 21" />
    <path d="M10 7 L10 9 M14 7 L14 9" />
  </svg>
);

// 天平/安定
export const IconBalance: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 3 L12 21" />
    <path d="M6 21 L18 21" />
    <path d="M4 8 L20 8" />
    <path d="M4 8 L2 14 Q4 16 6 14 Z" />
    <path d="M20 8 L18 14 Q20 16 22 14 Z" />
  </svg>
);

// 奖杯/威望
export const IconTrophy: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 4 L17 4 L17 11 Q17 14 12 14 Q7 14 7 11 Z" />
    <path d="M7 6 Q3 6 4 10 Q5 12 7 11" />
    <path d="M17 6 Q21 6 20 10 Q19 12 17 11" />
    <path d="M12 14 L12 18 M9 21 L15 21 M9 21 Q9 18 12 18 Q15 18 15 21" />
  </svg>
);

// 图表 —— 柱状
export const IconChart: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M3 21 L21 21" />
    <path d="M3 21 L3 3" />
    <path d="M7 21 L7 15 L10 15 L10 21" />
    <path d="M12 21 L12 9 L15 9 L15 21" />
    <path d="M17 21 L17 12 L20 12 L20 21" />
  </svg>
);

// 上升 —— 上升曲线+箭头
export const IconTrendUp: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M3 17 L9 11 L13 15 L21 7" />
    <path d="M15 7 L21 7 L21 13" />
  </svg>
);

// 下降 —— 下降曲线+箭头
export const IconTrendDown: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M3 7 L9 13 L13 9 L21 17" />
    <path d="M15 17 L21 17 L21 11" />
  </svg>
);

// 太极/通用
export const IconYinyang: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3 Q3 3 3 12 Q3 21 12 21 Q21 21 12 12 Q3 3 12 3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17.5" r="1.2" fill="none" stroke="currentColor" />
  </svg>
);

// 手机/移动端
export const IconMobile: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
    <path d="M10 18 L14 18" />
  </svg>
);

// 楼阁/山门
export const IconTemple: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M3 9 Q12 3 21 9" />
    <path d="M2 9 L22 9 L21 11 L3 11 Z" />
    <path d="M5 11 L5 20 M19 11 L19 20 M3 20 L21 20" />
    <path d="M10 11 L10 20 M14 11 L14 20" />
    <path d="M12 3 L12 1 M11 1 L13 1" />
  </svg>
);

// 群组/多人
export const IconGroup: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="8" cy="9" r="2.5" />
    <circle cx="16" cy="9" r="2.5" />
    <path d="M3 20 Q3 14 8 14 Q13 14 13 20" />
    <path d="M11 20 Q11 14 16 14 Q21 14 21 20" />
  </svg>
);

// 热气/温泉
export const IconSteam: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M8 4 Q6 6 8 8 Q10 10 8 12" />
    <path d="M12 3 Q10 5 12 7 Q14 9 12 11" />
    <path d="M16 4 Q14 6 16 8 Q18 10 16 12" />
    <path d="M4 16 Q4 14 6 14 L18 14 Q20 14 20 16 L20 20 L4 20 Z" />
  </svg>
);

// 符/卷符 (用于符箓)
export const IconScrollText: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 5 Q5 3 7 3 L17 3 Q19 3 19 5 L19 19 Q19 21 17 21 L7 21 Q5 21 5 19 Z" />
    <path d="M8 8 L16 8 M8 11 L16 11 M8 14 L13 14" />
    <path d="M5 5 Q3 5 3 7 M19 5 Q21 5 21 7" />
  </svg>
);

// 法器/单剑
export const IconSword: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 19 L14 10 L17 7 L19 5 L17 7 L14 10 L5 19 Z" />
    <path d="M14 10 L17 13" />
    <path d="M5 19 L7 17" />
    <path d="M5 19 Q4 20 3 21" />
  </svg>
);

export type IconName =
  | 'mountain' | 'building' | 'disciple' | 'cultivate' | 'warehouse'
  | 'battle' | 'world' | 'nextMonth' | 'scroll' | 'talisman'
  | 'close' | 'arrowRight' | 'back' | 'eye' | 'gear'
  | 'gem' | 'crystal' | 'pill' | 'book' | 'bulb'
  | 'warning' | 'herb' | 'lantern' | 'balance' | 'trophy'
  | 'chart' | 'trendUp' | 'trendDown' | 'yinyang' | 'mobile'
  | 'temple' | 'group' | 'steam' | 'scrollText' | 'sword';

const ICON_MAP: Record<IconName, React.FC<IconProps>> = {
  mountain: IconMountain,
  building: IconBuilding,
  disciple: IconDisciple,
  cultivate: IconCultivate,
  warehouse: IconWarehouse,
  battle: IconBattle,
  world: IconWorld,
  nextMonth: IconNextMonth,
  scroll: IconScroll,
  talisman: IconTalisman,
  close: IconClose,
  arrowRight: IconArrowRight,
  back: IconBack,
  eye: IconEye,
  gear: IconGear,
  gem: IconGem,
  crystal: IconCrystal,
  pill: IconPill,
  book: IconBook,
  bulb: IconBulb,
  warning: IconWarning,
  herb: IconHerb,
  lantern: IconLantern,
  balance: IconBalance,
  trophy: IconTrophy,
  chart: IconChart,
  trendUp: IconTrendUp,
  trendDown: IconTrendDown,
  yinyang: IconYinyang,
  mobile: IconMobile,
  temple: IconTemple,
  group: IconGroup,
  steam: IconSteam,
  scrollText: IconScrollText,
  sword: IconSword,
};

export const SectIcon: React.FC<IconProps & { name: IconName }> = ({ name, size, className, strokeWidth }) => {
  const Cmp = ICON_MAP[name];
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
};
