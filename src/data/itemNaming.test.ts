import { describe, it, expect } from 'vitest';
import { PILL_CONFIGS } from './pills';
import { ARTIFACT_CONFIGS } from './artifacts';
import { TALISMAN_CONFIGS } from './talismans';
import { BEAST_CONFIGS } from './beasts';
import { SHOP_ITEMS } from './shop';
import { PillTypeNames } from '@/types/pill';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { BeastTypeNames } from '@/types/beast';

/**
 * 成品（丹药/法器/符箓/灵兽）只允许一个展示名。
 * 类型名映射、配置表、配方表、商店必须完全一致，避免同一物品在不同界面显示不同名字。
 */
describe('成品名称一致性', () => {
  it('丹药：配置名 = 类型名', () => {
    for (const pill of Object.values(PILL_CONFIGS)) {
      expect(pill.name, pill.type).toBe(PillTypeNames[pill.type]);
    }
  });

  it('法器：配置名 = 类型名', () => {
    for (const artifact of Object.values(ARTIFACT_CONFIGS)) {
      expect(artifact.name, artifact.type).toBe(ArtifactTypeNames[artifact.type]);
    }
  });

  it('符箓：配置名 = 类型名', () => {
    for (const talisman of Object.values(TALISMAN_CONFIGS)) {
      expect(talisman.name, talisman.type).toBe(TalismanTypeNames[talisman.type]);
    }
  });

  it('灵兽：配置名 = 类型名', () => {
    for (const beast of Object.values(BEAST_CONFIGS)) {
      expect(beast.name, beast.type).toBe(BeastTypeNames[beast.type]);
    }
  });

  it('商店成品名 = 配置名', () => {
    for (const item of SHOP_ITEMS) {
      if (item.category === 'pill' && item.pillType) {
        expect(item.name).toBe(PILL_CONFIGS[item.pillType].name);
      } else if (item.category === 'artifact' && item.artifactType) {
        expect(item.name).toBe(ARTIFACT_CONFIGS[item.artifactType].name);
      } else if (item.category === 'talisman' && item.talismanType) {
        expect(item.name).toBe(TALISMAN_CONFIGS[item.talismanType].name);
      } else if (item.category === 'beast' && item.beastType) {
        expect(item.name).toBe(BEAST_CONFIGS[item.beastType].name);
      }
    }
  });

  it('同类成品之间不重名', () => {
    const groups = [
      Object.values(PILL_CONFIGS).map(p => p.name),
      Object.values(ARTIFACT_CONFIGS).map(a => a.name),
      Object.values(TALISMAN_CONFIGS).map(t => t.name),
      Object.values(BEAST_CONFIGS).map(b => b.name),
    ];
    for (const names of groups) {
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
