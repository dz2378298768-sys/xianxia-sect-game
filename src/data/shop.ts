import type { ShopItem, ShopCategory } from '@/types/shop';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';

// 丹方：每类丹药的配方，售价 = 该丹药 sellPrice × 3（配方比成品贵）
function buildPillRecipes(): ShopItem[] {
  return Object.values(PILL_CONFIGS).map(p => ({
    id: `pill_recipe:${p.type}`,
    category: 'pill_recipe' as ShopCategory,
    name: `${p.name}丹方`,
    description: `解锁丹堂生产「${p.name}」的配方。${p.effect}`,
    price: Math.floor(p.sellPrice * 3),
    recipePillType: p.type,
  }));
}

// 丹药成品：售价 = sellPrice
function buildPills(): ShopItem[] {
  return Object.values(PILL_CONFIGS).map(p => ({
    id: `pill:${p.type}`,
    category: 'pill' as ShopCategory,
    name: p.name,
    description: p.effect,
    price: p.sellPrice,
    pillType: p.type,
  }));
}

function buildArtifactRecipes(): ShopItem[] {
  return Object.values(ARTIFACT_CONFIGS).map(a => ({
    id: `artifact_recipe:${a.type}`,
    category: 'artifact_recipe' as ShopCategory,
    name: `${a.name}图谱`,
    description: `解锁炼器堂锻造「${a.name}」的图谱。${a.effect}`,
    price: Math.floor(a.sellPrice * 3),
    recipeArtifactType: a.type,
  }));
}

function buildArtifacts(): ShopItem[] {
  return Object.values(ARTIFACT_CONFIGS).map(a => ({
    id: `artifact:${a.type}`,
    category: 'artifact' as ShopCategory,
    name: a.name,
    description: a.effect,
    price: a.sellPrice,
    artifactType: a.type,
  }));
}

function buildTalismanRecipes(): ShopItem[] {
  return Object.values(TALISMAN_CONFIGS).map(t => ({
    id: `talisman_recipe:${t.type}`,
    category: 'talisman_recipe' as ShopCategory,
    name: `${t.name}符谱`,
    description: `解锁符堂绘制「${t.name}」的符谱。${t.effect}`,
    price: Math.floor(t.sellPrice * 3),
    recipeTalismanType: t.type,
  }));
}

function buildTalismans(): ShopItem[] {
  return Object.values(TALISMAN_CONFIGS).map(t => ({
    id: `talisman:${t.type}`,
    category: 'talisman' as ShopCategory,
    name: t.name,
    description: t.effect,
    price: t.sellPrice,
    talismanType: t.type,
  }));
}

function buildBeasts(): ShopItem[] {
  return Object.values(BEAST_CONFIGS).map(b => ({
    id: `beast:${b.type}`,
    category: 'beast' as ShopCategory,
    name: b.name,
    description: b.description,
    price: b.sellPrice,
    beastType: b.type,
  }));
}

export const SHOP_ITEMS: ShopItem[] = [
  ...buildPillRecipes(),
  ...buildPills(),
  ...buildArtifactRecipes(),
  ...buildArtifacts(),
  ...buildTalismanRecipes(),
  ...buildTalismans(),
  ...buildBeasts(),
];

export const SHOP_CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'pill_recipe', label: '丹方' },
  { key: 'pill', label: '丹药' },
  { key: 'artifact_recipe', label: '图谱' },
  { key: 'artifact', label: '法器' },
  { key: 'talisman_recipe', label: '符谱' },
  { key: 'talisman', label: '符箓' },
  { key: 'beast', label: '灵兽' },
];

export function getShopItemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter(i => i.category === category);
}
