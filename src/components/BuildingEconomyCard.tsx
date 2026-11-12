import { ScrollText } from 'lucide-react';
import type { Building } from '@/types/building';
import { RESIDENCE_TYPES_WITH_CAVE } from '@/types/building';
import { BUILDING_CONTRIBUTION_BONUS } from '@/domain/balance';
import { getEnshrinementCapacity } from '@/domain/enshrinement';
import { PillTypeNames } from '@/types/pill';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { getResidenceCapacityByLevel, getResidenceCultivationBonus, getTrainingGroundCapacityByLevel, LECTURE_HALL_BONUS_BY_LEVEL, TRAINING_GROUND_LEVEL_TABLE } from '@/utils/gameLogic';

// 建筑月度产出的展示字段（与 calculateBuildingOutput 的返回结构对齐）
export interface EconomyOutputView {
  spiritStones: number;
  herbs: number;
  iron: number;
  paper: number;
  reputation: number;
  pills: number;
  artifacts: number;
  talismans: number;
  beasts: number;
}

interface BuildingEconomyCardProps {
  building: Building;
  output: EconomyOutputView;
  maintenance: number;
  upgradeCost: { spiritStones: number; reputation?: number } | null;
}

type Tone = 'red' | 'green' | 'orange' | 'blue';

const TONE_STYLES: Record<Tone, { border: string; bg: string; title: string; dot: string }> = {
  red: {
    border: 'border-red-400/20',
    bg: 'bg-red-500/[0.06]',
    title: 'text-red-300/90',
    dot: 'bg-red-400',
  },
  green: {
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-500/[0.06]',
    title: 'text-emerald-300/90',
    dot: 'bg-emerald-400',
  },
  orange: {
    border: 'border-orange-400/20',
    bg: 'bg-orange-500/[0.06]',
    title: 'text-orange-300/90',
    dot: 'bg-orange-400',
  },
  blue: {
    border: 'border-sky-400/20',
    bg: 'bg-sky-500/[0.06]',
    title: 'text-sky-300/90',
    dot: 'bg-sky-400',
  },
};

const RESIDENCE_TYPES = RESIDENCE_TYPES_WITH_CAVE;

function Section({ title, tone, rows }: { title: string; tone: Tone; rows: string[] }) {
  const style = TONE_STYLES[tone];
  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} px-2.5 py-2 min-w-0`}>
      <div className={`flex items-center gap-1.5 mb-1 ${style.title}`}>
        <span className={`w-1 h-1 rounded-full ${style.dot}`} />
        <span className="text-[10px] font-display tracking-wide">{title}</span>
      </div>
      <div className="space-y-0.5">
        {rows.length === 0 ? (
          <div className="text-[10px] text-sect-jade/30">—</div>
        ) : (
          rows.map((row, i) => (
            <div key={i} className="text-[10px] leading-snug text-sect-jade/75 break-words">
              {row}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 统一建筑数值模板（手机端 2×2）
 * 固定四块：建筑消耗 / 建筑产出 / 弟子消耗 / 弟子获得
 * 所有数值均从当前建筑等级、配置与运行时产出推导，避免各堂口各写一套。
 */
export function BuildingEconomyCard({ building, output, maintenance, upgradeCost }: BuildingEconomyCardProps) {
  const level = building.level;
  const isActive = building.status === 'active';
  const bonus = BUILDING_CONTRIBUTION_BONUS[building.type] ?? 0;
  const training = TRAINING_GROUND_LEVEL_TABLE[Math.min(level, 3)] || TRAINING_GROUND_LEVEL_TABLE[1];
  const lectureBonus = LECTURE_HALL_BONUS_BY_LEVEL[Math.min(level, 3)] || 20;

  // ===== 建筑消耗 =====
  const costRows: string[] = [];
  // 升级后容量：等级只提升在岗容量，不乘算产出，需明确告知玩家升级到底买到什么
  const nextCapacity = (() => {
    if (level >= building.maxLevel) return building.discipleCapacity;
    // 英灵祠的升级收益是「供奉位」而不是在岗容量，单独展示，这里不参与通用容量行
    if (building.type === 'enshrinement_hall') return building.discipleCapacity;
    if (RESIDENCE_TYPES.includes(building.type)) {
      return getResidenceCapacityByLevel(building.type, level + 1);
    }
    if (building.type === 'training_ground') return getTrainingGroundCapacityByLevel(level + 1);
    if (building.discipleCapacity > 0) return building.discipleCapacity + 10;
    return building.discipleCapacity;
  })();
  if (isActive) {
    if (maintenance > 0) costRows.push(`维护 ${maintenance} 灵石/月`);
    if (upgradeCost) {
      const reputation = upgradeCost.reputation ? ` + ${upgradeCost.reputation} 声望` : '';
      costRows.push(`升级 ${upgradeCost.spiritStones} 灵石${reputation}`);
      if (nextCapacity > building.discipleCapacity) {
        costRows.push(`容量 ${building.discipleCapacity} → ${nextCapacity} 人`);
      }
      if (building.type === 'enshrinement_hall') {
        costRows.push(`供奉位 ${getEnshrinementCapacity(level)} → ${getEnshrinementCapacity(level + 1)}`);
      }
    } else if (level >= building.maxLevel) {
      costRows.push('已达最高等级');
    }
  } else {
    costRows.push('已关闭：暂停维护');
    costRows.push('重新开启后恢复');
  }

  // ===== 建筑产出 =====
  const outputRows: string[] = [];
  const pushOutput = (label: string, value: number) => {
    if (value > 0) outputRows.push(`${label} +${value}/月`);
  };
  if (isActive) {
    pushOutput('灵石', output.spiritStones);
    pushOutput('灵草', output.herbs);
    pushOutput('玄铁', output.iron);
    pushOutput('灵纸', output.paper);
    pushOutput('声望', output.reputation);
    pushOutput('丹药', output.pills);
    pushOutput('法器', output.artifacts);
    pushOutput('符箓', output.talismans);
    pushOutput('灵兽', output.beasts);

    if (building.type === 'mountain_gate') outputRows.push(`满员防御 +${level * 5}%`);
    if (building.type === 'array_hall') outputRows.push(`全宗防御 +${10 + (level - 1) * 5}%`);
    if (building.type === 'enshrinement_hall') outputRows.push('英灵庇佑：声望 / 修炼');

    // 生产堂的成品由「生产目标」决定，不在 baseOutput 里，需单独展示，否则玩家只看到代工灵石
    if (building.type === 'pill_hall' || building.type === 'forge_hall' || building.type === 'talisman_hall') {
      const labels = (building.productionTargets || [])
        .map(t => {
          if (t.pillType) return PillTypeNames[t.pillType as keyof typeof PillTypeNames];
          if (t.artifactType) return ArtifactTypeNames[t.artifactType as keyof typeof ArtifactTypeNames];
          if (t.talismanType) return TalismanTypeNames[t.talismanType as keyof typeof TalismanTypeNames];
          return null;
        })
        .filter((v): v is string => !!v);
      outputRows.push(labels.length > 0 ? `成品：${labels.join('、')}` : '成品：未设置生产目标');
    }
    if (building.type === 'training_ground' && outputRows.length === 0) outputRows.push('无资源产出（培养战力）');
    if (RESIDENCE_TYPES.includes(building.type) && outputRows.length === 0) outputRows.push('无资源产出（提升修炼）');
  } else {
    outputRows.push('建筑关闭，本月无产出');
  }
  if (outputRows.length === 0) outputRows.push('无资源产出');

  // ===== 弟子消耗 =====
  const discipleCostRows: string[] = [];
  switch (building.type) {
    case 'lecture_hall':
      discipleCostRows.push(`听讲 -${Math.abs(bonus)} 贡献/月`);
      break;
    case 'training_ground':
      discipleCostRows.push(`演武 -${training.cost} 贡献/月`);
      break;
    case 'pill_hall':
      discipleCostRows.push('炼丹：灵草 + 贡献');
      break;
    case 'forge_hall':
      discipleCostRows.push('炼器：玄铁 + 贡献');
      break;
    case 'talisman_hall':
      discipleCostRows.push('制符：灵纸 + 贡献');
      break;
    case 'spirit_beast_garden':
      discipleCostRows.push('灵兽饲料 2 灵草/只/月');
      break;
    case 'secret_library':
      discipleCostRows.push('学书 100~2000 贡献');
      break;
    case 'cave_mansion':
      discipleCostRows.push('入住 / 夺府 1000 贡献');
      break;
    default:
      break;
  }

  // ===== 弟子获得 =====
  const discipleGainRows: string[] = [];
  if (bonus > 0) discipleGainRows.push(`+${bonus} 贡献/月`);
  switch (building.type) {
    case 'mountain_gate':
      discipleGainRows.push('驻守，满员享防御加成');
      break;
    case 'lecture_hall':
      discipleGainRows.push(`修炼 +${lectureBonus}%（讲师可再提升）`);
      break;
    case 'servant_hall':
      discipleGainRows.push('灵韵越高，贡献与材料越多');
      break;
    case 'secret_library':
      discipleGainRows.push('功法 / 战技；金丹推演 +贡献');
      break;
    case 'pill_hall':
      discipleGainRows.push('丹药（突破 / 延寿）');
      break;
    case 'forge_hall':
      discipleGainRows.push('法器（装备 / 出售）');
      break;
    case 'talisman_hall':
      discipleGainRows.push('符箓（战斗 / 出售）');
      break;
    case 'array_hall':
      discipleGainRows.push('布阵，享全宗防御加成');
      break;
    case 'spirit_beast_garden':
      discipleGainRows.push('灵兽（战斗 / 陪伴）');
      break;
    case 'training_ground':
      discipleGainRows.push(`+${training.gain} 战力经验/月（100 = +5% 战力）`);
      break;
    case 'outer_residence':
    case 'inner_residence':
    case 'core_residence':
    case 'cave_mansion':
      discipleGainRows.push(`修炼 +${getResidenceCultivationBonus(building.type, level)}%`);
      break;
    case 'enshrinement_hall':
      discipleGainRows.push('全宗修炼 +1%~3% / 英灵');
      break;
    case 'skyscraper_tower':
      discipleGainRows.push('飞升资格');
      break;
    default:
      break;
  }

  // 关闭的建筑没有任何弟子效果：讲学加成、灵兽喂养、演武场经验都已停，
  // 不能继续罗列弟子消耗，否则玩家会以为「关了还在扣贡献」。
  if (!isActive) {
    discipleCostRows.length = 0;
    discipleGainRows.length = 0;
    discipleGainRows.push('建筑关闭，弟子停止工作');
  }

  return (
    <div className="rounded-2xl border border-sect-gold/20 bg-gradient-to-b from-sect-ink-light/35 to-sect-ink/20 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-sect-gold/15 bg-gradient-to-r from-sect-gold/10 to-transparent">
        <div className="flex items-center gap-1.5 min-w-0">
          <ScrollText size={13} className="text-sect-gold shrink-0" />
          <span className="font-display text-[11px] text-sect-gold tracking-wide">建筑数值档案</span>
        </div>
        <span className="text-[9px] text-sect-jade/50 whitespace-nowrap">
          Lv.{level}/{building.maxLevel} · 在岗 {building.assignedDisciples.length}/{building.discipleCapacity}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-2.5">
        <Section title="建筑消耗" tone="red" rows={costRows} />
        <Section title="建筑产出" tone="green" rows={outputRows} />
        <Section title="弟子消耗" tone="orange" rows={discipleCostRows} />
        <Section title="弟子获得" tone="blue" rows={discipleGainRows} />
      </div>
    </div>
  );
}
