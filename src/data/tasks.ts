import type { TaskConfig } from '@/types/task';

/** 任务池 v1：39 个任务（主线 15 / 支线 12 / 月度 6 / 成就 6） */
export const TASKS: TaskConfig[] = [
  // ==================== 主线（15，5 章） ====================
  {
    id: 'M01', type: 'main', chapter: 1,
    title: '开宗立派', description: '广纳门徒，使宗门初具规模。',
    metric: 'discipleCount', target: 5,
    rewards: { spiritStones: 100, reputation: 50 },
  },
  {
    id: 'M02', type: 'main', chapter: 1,
    title: '初建山门', description: '将杂役堂扩建至 2 级，安置更多弟子。',
    metric: 'buildingLevel', target: 2, params: { type: 'servant_hall' },
    prerequisite: ['M01'],
    rewards: { spiritStones: 150 },
  },
  {
    id: 'M03', type: 'main', chapter: 1,
    title: '首次筑基', description: '培养出第一位筑基期弟子。',
    metric: 'breakthroughCount', target: 1, params: { realm: 'foundation' },
    prerequisite: ['M02'],
    rewards: { spiritStones: 200, reputation: 100 },
  },
  {
    id: 'M04', type: 'main', chapter: 1,
    title: '小有名气', description: '将宗门提升至「小有名气」。',
    metric: 'sectLevel', target: 1,
    prerequisite: ['M03'],
    rewards: { spiritStones: 300, unlockPillRecipes: ['foundation_pill'] },
  },
  {
    id: 'M05', type: 'main', chapter: 2,
    title: '丹堂落成', description: '建造丹堂，开启炼丹之路。',
    metric: 'buildingCount', target: 1, params: { type: 'pill_hall' },
    prerequisite: ['M04'],
    rewards: { spiritStones: 300 },
  },
  {
    id: 'M06', type: 'main', chapter: 2,
    title: '初炼灵丹', description: '累计炼制 3 件丹药。',
    metric: 'pillCraftCount', target: 3,
    prerequisite: ['M05'],
    rewards: { spiritStones: 400, contribution: 100 },
  },
  {
    id: 'M07', type: 'main', chapter: 2,
    title: '金丹之资', description: '培养出第一位金丹期弟子。',
    metric: 'discipleRealmCount', target: 1, params: { realm: 'golden' },
    prerequisite: ['M06'],
    rewards: { spiritStones: 500, reputation: 200 },
  },
  {
    id: 'M08', type: 'main', chapter: 2,
    title: '声名鹊起', description: '将宗门提升至「声名鹊起」。',
    metric: 'sectLevel', target: 2,
    prerequisite: ['M07'],
    rewards: { spiritStones: 800, unlockArtifactRecipes: ['flying_sword'] },
  },
  {
    id: 'M09', type: 'main', chapter: 3,
    title: '大比扬名', description: '在任意大比中进入前三。',
    metric: 'tournamentTop3', target: 1,
    prerequisite: ['M08'],
    rewards: { spiritStones: 600, reputation: 200 },
  },
  {
    id: 'M10', type: 'main', chapter: 3,
    title: '元婴坐镇', description: '培养出第一位元婴期弟子。',
    metric: 'discipleRealmCount', target: 1, params: { realm: 'nascent' },
    prerequisite: ['M09'],
    rewards: { spiritStones: 1000, reputation: 300 },
  },
  {
    id: 'M11', type: 'main', chapter: 3,
    title: '威服一方', description: '使至少一个宗门成为附庸。',
    metric: 'vassalCount', target: 1,
    prerequisite: ['M10'],
    rewards: { spiritStones: 800, reputation: 200 },
  },
  {
    id: 'M12', type: 'main', chapter: 4,
    title: '一方霸主', description: '将宗门提升至「一方霸主」。',
    metric: 'sectLevel', target: 3,
    prerequisite: ['M11'],
    rewards: { spiritStones: 1500, reputation: 500 },
  },
  {
    id: 'M13', type: 'main', chapter: 4,
    title: '化神临世', description: '培养出第一位化神期弟子。',
    metric: 'discipleRealmCount', target: 1, params: { realm: 'spirit' },
    prerequisite: ['M12'],
    rewards: { spiritStones: 2000, reputation: 500 },
  },
  {
    id: 'M14', type: 'main', chapter: 5,
    title: '通天塔成', description: '建造通天塔，为飞升做准备。',
    metric: 'buildingCount', target: 1, params: { type: 'skyscraper_tower' },
    prerequisite: ['M13'],
    rewards: { spiritStones: 2000, reputation: 500 },
  },
  {
    id: 'M15', type: 'main', chapter: 5,
    title: '白日飞升', description: '见证弟子踏上通天塔，白日飞升。',
    metric: 'gameWon', target: 1,
    prerequisite: ['M14'],
    rewards: { spiritStones: 5000, reputation: 1000, specialMaterials: [{ name: '仙晶', amount: 1 }] },
  },

  // ==================== 支线（12） ====================
  {
    id: 'S01', type: 'side',
    title: '藏经阁开馆', description: '建造藏经阁。',
    metric: 'buildingCount', target: 1, params: { type: 'secret_library' },
    rewards: { spiritStones: 200 },
  },
  {
    id: 'S02', type: 'side',
    title: '炼器堂开炉', description: '建造炼器堂。',
    metric: 'buildingCount', target: 1, params: { type: 'forge_hall' },
    rewards: { spiritStones: 200 },
  },
  {
    id: 'S03', type: 'side',
    title: '符堂开坛', description: '建造符堂。',
    metric: 'buildingCount', target: 1, params: { type: 'talisman_hall' },
    rewards: { spiritStones: 200 },
  },
  {
    id: 'S04', type: 'side',
    title: '护山大阵', description: '建造阵堂。',
    metric: 'buildingCount', target: 1, params: { type: 'array_hall' },
    rewards: { spiritStones: 200 },
  },
  {
    id: 'S05', type: 'side',
    title: '灵兽栖息', description: '建造灵兽原。',
    metric: 'buildingCount', target: 1, params: { type: 'spirit_beast_garden' },
    rewards: { spiritStones: 200 },
  },
  {
    id: 'S06', type: 'side',
    title: '试炼常客', description: '累计完成 10 次试炼。',
    metric: 'trialCompleteCount', target: 10,
    rewards: { spiritStones: 300, reputation: 100 },
  },
  {
    id: 'S07', type: 'side',
    title: '山门魁首', description: '获得一次山门大比冠军。',
    metric: 'tournamentChampion', target: 1, params: { scope: 'sect' },
    rewards: { spiritStones: 500, reputation: 200 },
  },
  {
    id: 'S08', type: 'side',
    title: '天下第一', description: '获得一次宗门大比冠军。',
    metric: 'tournamentChampion', target: 1, params: { scope: 'inter-sect' },
    rewards: { spiritStones: 800, reputation: 300 },
  },
  {
    id: 'S09', type: 'side',
    title: '缔结同盟', description: '与至少一个宗门结为同盟。',
    metric: 'allyCount', target: 1,
    rewards: { spiritStones: 300, reputation: 100 },
  },
  {
    id: 'S10', type: 'side',
    title: '灵兽收藏', description: '收集 5 种灵兽。',
    metric: 'beastKinds', target: 5,
    rewards: { spiritStones: 400, specialMaterials: [{ name: '兽魂', amount: 2 }] },
  },
  {
    id: 'S11', type: 'side',
    title: '博览群书', description: '门下弟子累计习得 10 本功法/战技。',
    metric: 'booksLearned', target: 10,
    rewards: { spiritStones: 500, contribution: 200 },
  },
  {
    id: 'S12', type: 'side',
    title: '见多识广', description: '累计处理 10 个随机事件。',
    metric: 'eventResolveCount', target: 10,
    rewards: { spiritStones: 400, reputation: 100 },
  },

  // ==================== 月度（6 选 3） ====================
  {
    id: 'MT1', type: 'monthly',
    title: '勤勉治宗', description: '本月持续推进宗门事务。',
    metric: 'monthlyAdvance', target: 1,
    rewards: { spiritStones: 30 },
  },
  {
    id: 'MT2', type: 'monthly',
    title: '派遣试炼', description: '本月派遣 1 次试炼。',
    metric: 'monthlyTrial', target: 1,
    rewards: { spiritStones: 50 },
  },
  {
    id: 'MT3', type: 'monthly',
    title: '广纳门徒', description: '本月招收 1 名弟子。',
    metric: 'monthlyRecruit', target: 1,
    rewards: { spiritStones: 40, reputation: 20 },
  },
  {
    id: 'MT4', type: 'monthly',
    title: '开炉生产', description: '本月生产 1 件物品。',
    metric: 'monthlyCraft', target: 1,
    rewards: { spiritStones: 50 },
  },
  {
    id: 'MT5', type: 'monthly',
    title: '处置异闻', description: '本月处理 1 个随机事件。',
    metric: 'monthlyEvent', target: 1,
    rewards: { spiritStones: 60 },
  },
  {
    id: 'MT6', type: 'monthly',
    title: '修缮山门', description: '本月升级 1 座建筑。',
    metric: 'monthlyUpgrade', target: 1,
    rewards: { spiritStones: 60, reputation: 20 },
  },

  // ==================== 成就（6） ====================
  {
    id: 'A01', type: 'achievement',
    title: '门下百人', description: '宗门弟子达到 100 人。',
    metric: 'discipleCount', target: 100, hidden: true,
    rewards: { spiritStones: 1000, reputation: 300 },
  },
  {
    id: 'A02', type: 'achievement',
    title: '富甲一方', description: '宗门灵石达到 10000。',
    metric: 'spiritStones', target: 10000, hidden: true,
    rewards: { spiritStones: 1000, reputation: 300 },
  },
  {
    id: 'A03', type: 'achievement',
    title: '桃李满门', description: '拥有 10 位长老。',
    metric: 'elderCount', target: 10, hidden: true,
    rewards: { spiritStones: 800, reputation: 300 },
  },
  {
    id: 'A04', type: 'achievement',
    title: '天下归心', description: '与 5 个宗门结为同盟。',
    metric: 'allyCount', target: 5, hidden: true,
    rewards: { spiritStones: 800, reputation: 300 },
  },
  {
    id: 'A05', type: 'achievement',
    title: '万古长青', description: '将宗门提升至「万古长青」。',
    metric: 'sectLevel', target: 4, hidden: true,
    rewards: { spiritStones: 2000, reputation: 500 },
  },
  {
    id: 'A06', type: 'achievement',
    title: '白日飞升', description: '见证弟子飞升。',
    metric: 'gameWon', target: 1, hidden: true,
    rewards: { spiritStones: 3000, reputation: 500 },
  },
];

export const TASK_MAP: Record<string, TaskConfig> =
  TASKS.reduce((map, t) => { map[t.id] = t; return map; }, {} as Record<string, TaskConfig>);

export const MONTHLY_TASK_POOL = TASKS.filter(t => t.type === 'monthly');
