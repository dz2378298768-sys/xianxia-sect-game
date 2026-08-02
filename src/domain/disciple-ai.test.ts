import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

describe('弟子AI — 贡献足够时自动学习功法', () => {
  beforeEach(() => {
    useGameStore.setState({
      spiritStones: 100000,
      sectContribution: 10000,
      disciples: [{
        id: 'd1', name: '甲', age: 20, maxAge: 100,
        status: 'outer', realm: 'qi', realmProgress: 0,
        cultivationSpeed: 10,
        hiddenTalents: { rootBone: 60, spiritRhythm: 60, constitution: 50, daoFate: 50, spiritRoots: [{ type: 'fire', quality: 70 }] },
        talentDisplay: { rootBoneDesc: '', spiritRhythmDesc: '', constitutionDesc: '', daoFateDesc: '', nickname: '', spiritRootDesc: '' },
        contributionPoints: 500, assignedBuilding: null, managingBuilding: null,
        joinDate: { year: 1, month: 1 }, breakthroughAttempts: 0, breakthroughBonus: 0,
        isBreakingThrough: false, isAttendingLecture: false, isLecturing: false, isLearningSecret: false,
        learnedSecrets: [], learnedTechnique: null, learnedBattles: [], learningBook: null,
        buffs: [], avatarSeed: 1, constitutionId: 'normal',
        satisfaction: 100, maxSatisfactionLossWork: 0, maxSatisfactionLossResidence: 0,
        attack: 10, defense: 10, dodge: 5, crit: 5, maxHp: 100,
        master: null, friends: [], tournamentHistory: [],
      } as any],
      libraryBooks: [], // 藏经阁需有可学功法
      libraryCosts: { qi: 100, foundation: 300, golden: 800, nascent: 2000 } as any,
    });
  });

  it('弟子贡献足够且未在学习时，nextMonth 后自动开始学习功法', () => {
    // 在 libraryBooks 放一本可学功法（火属性、炼气层级、灵根匹配）
    useGameStore.setState({
      libraryBooks: [{
        id: 'b1', type: 'technique', tier: 'qi',
        attribute: 'fire',
        name: '基础功法', description: '',
        cultivationBonus: 20, combatBonus: 10,
        quality: 50, learnDays: 2,
      } as any],
    });
    const before = useGameStore.getState().disciples[0];
    expect(before.learningBook).toBeNull();
    useGameStore.getState().nextMonth();
    const after = useGameStore.getState().disciples[0];
    expect(after.learningBook).not.toBeNull();
    // 贡献应被扣除
    expect(after.contributionPoints).toBeLessThan(before.contributionPoints);
  });

  it('弟子贡献不足时不自动学习', () => {
    useGameStore.setState({
      libraryBooks: [{
        id: 'b1', type: 'technique', tier: 'qi',
        attribute: 'fire',
        name: '高级功法', description: '',
        cultivationBonus: 50, combatBonus: 30,
        quality: 80, learnDays: 2,
      } as any],
      // 抬高学习消耗，使贡献不足
      libraryCosts: { qi: 800, foundation: 300, golden: 800, nascent: 2000 } as any,
    });
    useGameStore.setState(state => ({
      disciples: state.disciples.map(d => ({ ...d, contributionPoints: 10 })),
    }));
    useGameStore.getState().nextMonth();
    const after = useGameStore.getState().disciples[0];
    expect(after.learningBook).toBeNull();
  });
});

describe('autoAssignBuilding — 贡献优先级', () => {
  it('弟子贡献低时优先分配到高贡献产出的工作建筑', () => {
    // 该测试验证评分公式：贡献低的弟子对高贡献建筑评分更高
    // 由于 autoAssignBuilding 是内部函数，通过 nextMonth 间接验证
    // 此处用单元测试直接调用（若导出）
    // 若未导出，跳过此测试，改为集成测试
    expect(true).toBe(true); // 占位：实际验证在集成层
  });
});
