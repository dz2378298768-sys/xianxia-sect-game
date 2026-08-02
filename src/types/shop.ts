import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
import type { BeastType } from '@/types/beast';

// 商店商品七大类
export type ShopCategory =
  | 'pill_recipe'      // 丹方：解锁丹堂生产该丹药
  | 'pill'             // 丹药成品
  | 'artifact_recipe'  // 图谱：解锁炼器堂生产该法器
  | 'artifact'         // 法器成品
  | 'talisman_recipe'  // 符谱：解锁符堂生产该符箓
  | 'talisman'         // 符箓成品
  | 'beast';           // 灵兽

export interface ShopItem {
  id: string;                // 唯一标识，如 'pill:foundation_pill' / 'pill_recipe:golden_pill'
  category: ShopCategory;
  name: string;
  description: string;
  price: number;             // 灵石售价
  // 成品类：购买后增加对应库存
  pillType?: PillType;
  artifactType?: ArtifactType;
  talismanType?: TalismanType;
  beastType?: BeastType;
  // 配方类：购买后解锁对应生产配方
  recipePillType?: PillType;
  recipeArtifactType?: ArtifactType;
  recipeTalismanType?: TalismanType;
}
