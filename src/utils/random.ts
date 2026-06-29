export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedRandom<T>(items: { value: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  
  return items[items.length - 1].value;
}

const surnames = [
  '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕',
];

const givenNames = [
  '青云', '子墨', '风眠', '雪落', '星辰', '月影', '凌天', '傲雪',
  '惊鸿', '游龙', '飞凤', '逐鹿', '望月', '听风', '观雨', '踏雪',
  '凌霄', '紫烟', '玉衡', '瑶光', '璇玑', '天枢', '玄武', '白虎',
  '朱雀', '青龙', '清玄', '道一', '无尘', '忘机', '浩然', '长歌',
  '思远', '知微', '守拙', '怀瑾', '握瑜', '云帆', '沧海', '巫山',
];

export function generateDiscipleName(): string {
  const surname = surnames[randomInt(0, surnames.length - 1)];
  const givenName = givenNames[randomInt(0, givenNames.length - 1)];
  return surname + givenName;
}
