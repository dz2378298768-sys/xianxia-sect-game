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

// ============== 丹药专属图标（9 种）==============
// 筑基丹 —— 圆丹+底座光晕
export const IconPillFoundation: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="11" r="5" />
    <path d="M9 11 Q12 8 15 11" />
    <path d="M7 20 Q12 16 17 20" />
    <path d="M12 16 L12 18" />
  </svg>
);
// 金丹破障丹 —— 金丹+裂纹突破
export const IconPillGolden: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="6" />
    <path d="M12 6 L12 9 M6 12 L9 12 M18 12 L15 12 M12 18 L12 15" />
    <path d="M8 8 L10 10 M16 8 L14 10 M8 16 L10 14 M16 16 L14 14" />
  </svg>
);
// 元婴化灵丹 —— 婴形+灵气
export const IconPillNascent: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="8" r="2.5" />
    <path d="M8 18 Q8 12 12 12 Q16 12 16 18" />
    <path d="M5 6 Q4 4 6 3 M19 6 Q20 4 18 3" />
  </svg>
);
// 化神渡劫丹 —— 丹+雷劫
export const IconPillSpirit: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="14" r="4" />
    <path d="M10 4 L8 8 L11 8 L9 12" />
    <path d="M16 5 L18 7" />
  </svg>
);
// 回灵丹 —— 丹+流动气纹
export const IconPillRecovery: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <ellipse cx="12" cy="12" rx="6" ry="4" />
    <path d="M6 12 Q9 10 12 12 Q15 14 18 12" />
  </svg>
);
// 增寿丹 —— 丹+寿桃纹
export const IconPillLongevity: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="13" r="5" />
    <path d="M12 8 Q10 5 12 4 Q14 5 12 8" />
    <path d="M9 13 L11 13 M13 13 L15 13" />
  </svg>
);
// 清心丹 —— 丹+莲心
export const IconPillDetox: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="13" r="4" />
    <path d="M12 9 L12 5 M9 6 Q12 4 15 6" />
    <path d="M6 18 L8 18 M16 18 L18 18" />
  </svg>
);
// 聚气丹 —— 丹+气漩
export const IconPillQiGathering: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 4 Q6 6 6 12 Q6 18 12 20 Q18 18 18 12 Q18 6 12 4" />
    <path d="M9 9 Q12 7 15 9" />
  </svg>
);
// 锻骨丹 —— 丹+骨骼
export const IconPillBodyForging: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="5" />
    <path d="M9 9 L10 11 L9 13 L10 15 M15 9 L14 11 L15 13 L14 15" />
    <path d="M10 11 L14 11 M10 13 L14 13" />
  </svg>
);

// ============== 法器专属图标（8 种）==============
// 飞剑 —— 剑身+流光
export const IconArtifactFlyingSword: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M4 20 L16 8 L20 4 L18 8 L6 20 Z" />
    <path d="M6 20 Q4 22 3 21" />
    <path d="M14 10 Q18 6 21 3" />
  </svg>
);
// 防御盾 —— 龟甲盾
export const IconArtifactShield: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 3 L20 6 L20 12 Q20 18 12 21 Q4 18 4 12 L4 6 Z" />
    <path d="M8 9 L12 7 L16 9 L16 13 Q16 16 12 17 Q8 16 8 13 Z" />
    <path d="M12 7 L12 17" />
  </svg>
);
// 攻击符（赤焰刀）—— 刀身+火焰
export const IconArtifactAttackTalisman: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 19 L17 7 L19 9 L7 21 Z" />
    <path d="M5 19 L3 21" />
    <path d="M15 3 Q13 5 15 7 Q17 5 15 3" />
    <path d="M19 5 Q17 7 19 9 Q21 7 19 5" />
  </svg>
);
// 聚灵瓶 —— 瓶+灵气
export const IconArtifactSpiritBottle: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M10 3 L14 3 L14 6 L15 8 L15 19 Q15 20 14 20 L10 20 Q9 20 9 19 L9 8 L10 6 Z" />
    <path d="M9 12 Q12 10 15 12" />
    <circle cx="12" cy="15" r="1.5" />
  </svg>
);
// 储物戒 —— 戒指+空间纹
export const IconArtifactSpaceRing: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <ellipse cx="12" cy="14" rx="7" ry="3" />
    <circle cx="12" cy="8" r="2.5" />
    <path d="M9 14 Q12 12 15 14" />
  </svg>
);
// 雷珠 —— 珠+雷电
export const IconArtifactThunderPearl: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="13" r="6" />
    <path d="M12 3 L9 8 L12 8 L10 13" />
    <path d="M14 9 L17 6" />
  </svg>
);
// 八卦镜 —— 镜+八卦
export const IconArtifactBaguaMirror: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 4 L12 7 M12 17 L12 20 M4 12 L7 12 M17 12 L20 12" />
    <path d="M6.5 6.5 L8.5 8.5 M15.5 15.5 L17.5 17.5 M6.5 17.5 L8.5 15.5 M15.5 8.5 L17.5 6.5" />
  </svg>
);
// 镇妖塔 —— 多层塔
export const IconArtifactDemonPagoda: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 2 L8 5 L16 5 Z" />
    <path d="M8 5 L8 9 L16 9 L16 5" />
    <path d="M7 9 L7 13 L17 13 L17 9" />
    <path d="M6 13 L6 17 L18 17 L18 13" />
    <path d="M5 17 L5 21 L19 21 L19 17" />
    <path d="M12 9 L12 11" />
  </svg>
);

// ============== 符箓专属图标（9 种）==============
// 烈火符 —— 符+火焰
export const IconTalismanFire: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M12 7 Q9 10 12 13 Q15 10 12 7" />
    <path d="M12 11 Q10 13 12 15 Q14 13 12 11" />
  </svg>
);
// 寒冰符 —— 符+冰晶
export const IconTalismanIce: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M12 7 L12 17 M8 12 L16 12 M9 9 L15 15 M15 9 L9 15" />
  </svg>
);
// 惊雷符 —— 符+闪电
export const IconTalismanThunder: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M13 6 L9 13 L12 13 L10 18 L15 11 L12 11 Z" fill="currentColor" />
  </svg>
);
// 回春符 —— 符+生机叶
export const IconTalismanHeal: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M12 17 L12 10 Q9 10 8 7 Q11 7 12 10 Q13 7 16 7 Q15 10 12 10" />
  </svg>
);
// 传送符 —— 符+漩涡
export const IconTalismanTeleport: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M12 7 Q7 9 9 13 Q11 16 14 14 Q16 12 13 11" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </svg>
);
// 隐身符 —— 符+虚影
export const IconTalismanStealth: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" strokeDasharray="2 1.5" />
    <circle cx="12" cy="10" r="2" />
    <path d="M9 18 Q9 13 12 13 Q15 13 15 18" strokeDasharray="2 1.5" />
  </svg>
);
// 镇宅符 —— 符+山门
export const IconTalismanWard: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M9 18 L9 12 L12 9 L15 12 L15 18" />
    <path d="M11 18 L11 14 L13 14 L13 18" />
  </svg>
);
// 剑气符 —— 符+剑
export const IconTalismanSword: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M10 17 L15 12 L17 10 L13 14 L10 17 Z" />
    <path d="M10 17 L8 19" />
  </svg>
);
// 神行符 —— 符+风
export const IconTalismanDivine: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M7 3 L17 3 L17 21 L7 21 Z" />
    <path d="M8 10 Q12 8 16 10 M8 13 Q12 11 16 13 M8 16 Q12 14 16 16" />
  </svg>
);

// ============== 灵兽专属图标（7 种）==============
// 灵狐 —— 狐首
export const IconBeastSpiritFox: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 8 L8 4 L9 8 M19 8 L16 4 L15 8" />
    <path d="M5 8 Q4 14 8 16 Q12 18 16 16 Q20 14 19 8" />
    <circle cx="10" cy="11" r="0.8" fill="currentColor" />
    <circle cx="14" cy="11" r="0.8" fill="currentColor" />
    <path d="M12 13 L11 14 L12 14.5 L13 14 L12 13" />
  </svg>
);
// 玄龟 —— 龟壳
export const IconBeastMysticTurtle: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M4 14 Q4 8 12 8 Q20 8 20 14 L18 18 L6 18 Z" />
    <path d="M4 14 L2 13 M20 14 L22 13 M9 18 L9 20 M15 18 L15 20" />
    <path d="M8 12 L12 11 L16 12 M10 15 L14 15" />
  </svg>
);
// 火鸦 —— 鸦+火
export const IconBeastFireCrow: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M5 12 Q8 6 12 6 Q16 6 19 12 L21 11 L19 14 L5 14 L3 13 Z" />
    <circle cx="14" cy="10" r="0.8" fill="currentColor" />
    <path d="M10 16 Q8 19 10 20 M14 16 Q12 19 14 20" />
  </svg>
);
// 玉兔 —— 兔首
export const IconBeastJadeRabbit: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M8 4 Q7 8 9 9 M16 4 Q17 8 15 9" />
    <circle cx="12" cy="13" r="5" />
    <circle cx="10" cy="12" r="0.6" fill="currentColor" />
    <circle cx="14" cy="12" r="0.6" fill="currentColor" />
    <path d="M11 15 Q12 16 13 15" />
  </svg>
);
// 金鹏 —— 展翅鸟
export const IconBeastGoldenRoc: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M12 6 L12 18" />
    <path d="M12 9 Q6 6 3 9 Q6 10 12 11" />
    <path d="M12 9 Q18 6 21 9 Q18 10 12 11" />
    <path d="M10 18 Q12 21 14 18" />
    <path d="M11 6 L13 6" />
  </svg>
);
// 寒霜蛇 —— 蛇形
export const IconBeastIceSerpent: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M4 6 Q8 8 8 12 Q8 16 14 16 Q20 16 20 12 Q20 8 16 8" />
    <circle cx="18" cy="9" r="0.6" fill="currentColor" />
    <path d="M19 9 L21 8" />
    <path d="M6 4 L8 5 M5 18 L7 19" />
  </svg>
);
// 巨力熊 —— 熊首
export const IconBeastEarthBear: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="6" />
    <circle cx="7" cy="8" r="2" />
    <circle cx="17" cy="8" r="2" />
    <circle cx="10" cy="11" r="0.8" fill="currentColor" />
    <circle cx="14" cy="11" r="0.8" fill="currentColor" />
    <path d="M10 14 Q12 16 14 14" />
    <path d="M9 19 L9 21 M15 19 L15 21" />
  </svg>
);

// 礼物/兑换：礼盒
export const IconGift: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <path d="M3 10 L21 10 L21 20 L3 20 Z" />
    <path d="M12 10 L12 20" />
    <path d="M3 10 L3 8 Q3 6 5 6 L8 6 Q10 6 10 8 L10 10" />
    <path d="M21 10 L21 8 Q21 6 19 6 L16 6 Q14 6 14 8 L14 10" />
    <path d="M12 6 L12 10" />
    <path d="M10 6 Q12 3 14 6 Q16 4 15 2 M14 6 Q12 3 10 6 Q8 4 9 2" />
  </svg>
);

// 播放/广告：三角形播放键
export const IconPlay: React.FC<IconProps> = ({ size = 24, className = '', strokeWidth = 1.8 }) => (
  <svg {...baseProps(size, className, strokeWidth)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8 L17 12 L10 16 Z" fill="currentColor" />
  </svg>
);

export type IconName =
  | 'mountain' | 'building' | 'disciple' | 'cultivate' | 'warehouse'
  | 'battle' | 'world' | 'nextMonth' | 'scroll' | 'talisman'
  | 'close' | 'arrowRight' | 'back' | 'eye' | 'gear'
  | 'gift' | 'play'
  | 'gem' | 'crystal' | 'pill' | 'book' | 'bulb'
  | 'warning' | 'herb' | 'lantern' | 'balance' | 'trophy'
  | 'chart' | 'trendUp' | 'trendDown' | 'yinyang' | 'mobile'
  | 'temple' | 'group' | 'steam' | 'scrollText' | 'sword'
  // 丹药专属
  | 'pillFoundation' | 'pillGolden' | 'pillNascent' | 'pillSpirit'
  | 'pillRecovery' | 'pillLongevity' | 'pillDetox'
  | 'pillQiGathering' | 'pillBodyForging'
  // 法器专属
  | 'artifactFlyingSword' | 'artifactShield' | 'artifactAttackTalisman'
  | 'artifactSpiritBottle' | 'artifactSpaceRing' | 'artifactThunderPearl'
  | 'artifactBaguaMirror' | 'artifactDemonPagoda'
  // 符箓专属
  | 'talismanFire' | 'talismanIce' | 'talismanThunder' | 'talismanHeal'
  | 'talismanTeleport' | 'talismanStealth' | 'talismanWard'
  | 'talismanSword' | 'talismanDivine'
  // 灵兽专属
  | 'beastSpiritFox' | 'beastMysticTurtle' | 'beastFireCrow'
  | 'beastJadeRabbit' | 'beastGoldenRoc' | 'beastIceSerpent'
  | 'beastEarthBear';

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
  gift: IconGift,
  play: IconPlay,
  // 丹药
  pillFoundation: IconPillFoundation,
  pillGolden: IconPillGolden,
  pillNascent: IconPillNascent,
  pillSpirit: IconPillSpirit,
  pillRecovery: IconPillRecovery,
  pillLongevity: IconPillLongevity,
  pillDetox: IconPillDetox,
  pillQiGathering: IconPillQiGathering,
  pillBodyForging: IconPillBodyForging,
  // 法器
  artifactFlyingSword: IconArtifactFlyingSword,
  artifactShield: IconArtifactShield,
  artifactAttackTalisman: IconArtifactAttackTalisman,
  artifactSpiritBottle: IconArtifactSpiritBottle,
  artifactSpaceRing: IconArtifactSpaceRing,
  artifactThunderPearl: IconArtifactThunderPearl,
  artifactBaguaMirror: IconArtifactBaguaMirror,
  artifactDemonPagoda: IconArtifactDemonPagoda,
  // 符箓
  talismanFire: IconTalismanFire,
  talismanIce: IconTalismanIce,
  talismanThunder: IconTalismanThunder,
  talismanHeal: IconTalismanHeal,
  talismanTeleport: IconTalismanTeleport,
  talismanStealth: IconTalismanStealth,
  talismanWard: IconTalismanWard,
  talismanSword: IconTalismanSword,
  talismanDivine: IconTalismanDivine,
  // 灵兽
  beastSpiritFox: IconBeastSpiritFox,
  beastMysticTurtle: IconBeastMysticTurtle,
  beastFireCrow: IconBeastFireCrow,
  beastJadeRabbit: IconBeastJadeRabbit,
  beastGoldenRoc: IconBeastGoldenRoc,
  beastIceSerpent: IconBeastIceSerpent,
  beastEarthBear: IconBeastEarthBear,
};

export const SectIcon: React.FC<IconProps & { name: IconName }> = ({ name, size, className, strokeWidth }) => {
  const Cmp = ICON_MAP[name];
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
};
