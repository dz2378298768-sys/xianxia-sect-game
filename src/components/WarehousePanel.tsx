import React, { useState, useMemo, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';
import { SHOP_ITEMS } from '@/data/shop';
import { SPECIAL_MATERIAL_MAP, RARITY_LABEL, RARITY_COLOR } from '@/data/specialMaterials';
import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
import type { BeastType } from '@/types/beast';
import type { IconName } from '@/components/icons/SectIcons';
import { SectIcon } from '@/components/icons/SectIcons';
import type { Disciple } from '@/types/disciple';
import { getRealmDisplay } from '@/types/disciple';
import type { AutoTradeRule } from '@/types/game';

// 图鉴大图：放在 public/ 根目录，构建后 dist/ 下与 index.html 同级。
// 使用相对路径 ./catalog-xxx.jpg，file:// 协议下也能正常解析
// （Capacitor Android 加载 file:///android_asset/public/index.html，
//  ./catalog-pills.jpg → file:///android_asset/public/catalog-pills.jpg，真实存在）
const CATALOG_IMG: Record<WarehouseTab, string> = {
  pills: './catalog-pills.jpg',
  artifacts: './catalog-artifacts.jpg',
  talismans: './catalog-talismans.jpg',
  beasts: './catalog-beasts.jpg',
  materials: './catalog-talismans.jpg',
};

type WarehouseTab = 'pills' | 'artifacts' | 'talismans' | 'beasts' | 'materials';

// 原材料条目信息
interface MaterialInfo {
  name: string;
  description: string;
  iconName: IconName;
  rarity?: string;
  price?: number; // 参考兑换价格（灵石买入价，用于推导贡献兑换参考值）
  isBasic?: boolean; // 基础材料
  building?: string; // 建议炼制建筑
}

// 基础原材料 + 特殊原材料信息映射
const MATERIAL_INFOS: Record<string, MaterialInfo> = {
  '灵草': { name: '灵草', description: '炼丹基础药材，杂役堂每月产出', iconName: 'herb', isBasic: true, price: 10, building: '丹堂' },
  '玄铁': { name: '玄铁', description: '炼器基础矿石，杂役堂每月产出', iconName: 'artifactFlyingSword', isBasic: true, price: 15, building: '炼器堂' },
  '灵纸': { name: '灵纸', description: '制符基础材料，杂役堂每月产出', iconName: 'scrollText', isBasic: true, price: 8, building: '符堂' },
};

// 基础材料名列表（用于渲染顺序）
const BASIC_MATERIAL_NAMES = ['灵草', '玄铁', '灵纸'];

// 初始化 MATERIAL_INFOS 中来自 SPECIAL_MATERIAL_MAP 的条目


// 各类型 → 专属图标名映射
const PILL_ICON_MAP: Record<PillType, IconName> = {
  foundation_pill: 'pillFoundation',
  golden_pill: 'pillGolden',
  nascent_pill: 'pillNascent',
  spirit_pill: 'pillSpirit',
  recovery_pill: 'pillRecovery',
  longevity_pill: 'pillLongevity',
  detox_pill: 'pillDetox',
  qi_gathering_pill: 'pillQiGathering',
  body_forging_pill: 'pillBodyForging',
};

const ARTIFACT_ICON_MAP: Record<ArtifactType, IconName> = {
  flying_sword: 'artifactFlyingSword',
  defensive_shield: 'artifactShield',
  attack_talisman: 'artifactAttackTalisman',
  spirit_bottle: 'artifactSpiritBottle',
  space_ring: 'artifactSpaceRing',
  thunder_pearl: 'artifactThunderPearl',
  bagua_mirror: 'artifactBaguaMirror',
  demon_pagoda: 'artifactDemonPagoda',
};

const TALISMAN_ICON_MAP: Record<TalismanType, IconName> = {
  fire_talisman: 'talismanFire',
  ice_talisman: 'talismanIce',
  thunder_talisman: 'talismanThunder',
  heal_talisman: 'talismanHeal',
  teleport_talisman: 'talismanTeleport',
  stealth_talisman: 'talismanStealth',
  ward_talisman: 'talismanWard',
  sword_talisman: 'talismanSword',
  divine_talisman: 'talismanDivine',
};

const BEAST_ICON_MAP: Record<BeastType, IconName> = {
  spirit_fox: 'beastSpiritFox',
  mystic_turtle: 'beastMysticTurtle',
  fire_crow: 'beastFireCrow',
  jade_rabbit: 'beastJadeRabbit',
  golden_roc: 'beastGoldenRoc',
  ice_serpent: 'beastIceSerpent',
  earth_bear: 'beastEarthBear',
};

// 品阶展示
const TIER_LABEL: Record<string, string> = {
  low: '下品',
  middle: '中品',
  high: '上品',
  top: '极品',
};

// 分类主色
const TAB_THEME: Record<WarehouseTab, { color: string; bg: string }> = {
  pills: { color: 'text-sect-pill-light', bg: 'rgba(220, 100, 50, 0.12)' },
  artifacts: { color: 'text-blue-300', bg: 'rgba(60, 130, 220, 0.12)' },
  talismans: { color: 'text-red-300', bg: 'rgba(200, 60, 60, 0.12)' },
  beasts: { color: 'text-amber-300', bg: 'rgba(200, 150, 50, 0.12)' },
  materials: { color: 'text-emerald-300', bg: 'rgba(52, 180, 130, 0.12)' },
};

interface ItemData {
  id: string;
  name: string;
  description: string;
  effect: string;
  quantity: number;
  iconName: IconName;
  tier?: string;
  tierNum?: number;
  materials?: { name: string; amount: number }[]; // 炼制所需原材料配方
  buildingType?: string; // 所属生产建筑（丹堂/炼器堂/符堂）
  shopItemId?: string;   // 对应 SHOP_ITEMS 的 id，用于交易 & 自动交易
  buyPrice?: number;     // 购买价（灵石）
  sellPrice?: number;    // 出售回收价（灵石）
  isMaterial?: boolean;  // 是否原材料
  materialName?: string; // 原材料原名
  referencePrice?: number; // 贡献兑换参考价
}

export const WarehousePanel: React.FC = () => {
  const {
    pillInventory, artifactInventory, talismanInventory, beastInventory, spiritStones,
    herbInventory, ironInventory, paperInventory, specialMaterials,
    disciples, exchangeItemByDisciple, giftItemToDisciple,
    buyShopItem, sellShopItem, autoTrade, setAutoTradeRule, toggleAutoTrade,
    exchangeMaterialByDisciple,
  } = useGameStore();
  const [activeTab, setActiveTab] = useState<WarehouseTab>('pills');
  // 选中物品的详情弹窗（替代原生 title hover，手机端无 hover）
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  // 图鉴图加载状态：onerror 时失败隐藏，默认展示背景色兜底
  const imgLoadFailed = useRef<Record<string, boolean>>({});
  const [imgRetryTick, setImgRetryTick] = useState(0);

  // ——— 兑换/赠送弹窗共用状态 ———
  const [actionMode, setActionMode] = useState<null | 'exchange' | 'gift'>(null);
  const [selectedDiscipleId, setSelectedDiscipleId] = useState<string | null>(null);
  // 玩家可手动输入的贡献值（兑换）与满意度增量（赠送，空=默认）
  const [inputContribution, setInputContribution] = useState<string>('50');
  const [inputSatisfaction, setInputSatisfaction] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // 自动交易设置展开状态（按 shopItemId 暂不用，就一个选中物品就够）
  const [showAutoTrade, setShowAutoTrade] = useState<boolean>(false);

  // toast 短暂展示
  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2200);
  };

  const getPillQuantity = (type: PillType): number =>
    pillInventory.find(p => p.type === type)?.quantity || 0;
  const getArtifactQuantity = (type: ArtifactType): number =>
    artifactInventory.find(a => a.type === type)?.quantity || 0;
  const getTalismanQuantity = (type: TalismanType): number =>
    talismanInventory.find(t => t.type === type)?.quantity || 0;
  const getBeastQuantity = (type: BeastType): number =>
    beastInventory.find(b => b.type === type)?.quantity || 0;

  // 兑换原材料的数量 & 贡献值输入
  const [matQty, setMatQty] = useState<string>('1');
  const [matContrib, setMatContrib] = useState<string>('20');

  // 各分类总数
  const counts = useMemo(() => {
    const specCount = Object.values(specialMaterials).reduce((s, n) => s + (n || 0), 0);
    return {
      pills: pillInventory.reduce((s, p) => s + p.quantity, 0),
      artifacts: artifactInventory.reduce((s, a) => s + a.quantity, 0),
      talismans: talismanInventory.reduce((s, t) => s + t.quantity, 0),
      beasts: beastInventory.reduce((s, b) => s + b.quantity, 0),
      materials: herbInventory + ironInventory + paperInventory + specCount,
    };
  }, [pillInventory, artifactInventory, talismanInventory, beastInventory, herbInventory, ironInventory, paperInventory, specialMaterials]);

  const tabs: { id: WarehouseTab; label: string; iconName: IconName; count: number }[] = [
    { id: 'pills', label: '丹药', iconName: 'pill', count: counts.pills },
    { id: 'artifacts', label: '法器', iconName: 'sword', count: counts.artifacts },
    { id: 'talismans', label: '符箓', iconName: 'scrollText', count: counts.talismans },
    { id: 'beasts', label: '灵兽', iconName: 'talisman', count: counts.beasts },
    { id: 'materials', label: '材料', iconName: 'warehouse', count: counts.materials },
  ];

  // 当前分类所有物品（包括库存为 0 的，全部展示）
  const items: ItemData[] = useMemo(() => {
    if (activeTab === 'pills') {
      return Object.values(PILL_CONFIGS).map(p => {
        const shop = SHOP_ITEMS.find(i => i.id === `pill:${p.type}`);
        return {
          id: p.type,
          name: p.name,
          description: p.description,
          effect: p.effect,
          quantity: getPillQuantity(p.type),
          iconName: PILL_ICON_MAP[p.type],
          materials: p.materials,
          buildingType: 'pill_hall',
          shopItemId: shop?.id,
          buyPrice: shop?.price,
          sellPrice: shop?.sellPrice,
        };
      });
    }
    if (activeTab === 'artifacts') {
      return Object.values(ARTIFACT_CONFIGS).map(a => {
        const shop = SHOP_ITEMS.find(i => i.id === `artifact:${a.type}`);
        return {
          id: a.type,
          name: a.name,
          description: a.description,
          effect: a.effect,
          quantity: getArtifactQuantity(a.type),
          iconName: ARTIFACT_ICON_MAP[a.type],
          tier: a.tier,
          materials: a.materials,
          buildingType: 'sutra_hall',
          shopItemId: shop?.id,
          buyPrice: shop?.price,
          sellPrice: shop?.sellPrice,
        };
      });
    }
    if (activeTab === 'talismans') {
      return Object.values(TALISMAN_CONFIGS).map(t => {
        const shop = SHOP_ITEMS.find(i => i.id === `talisman:${t.type}`);
        return {
          id: t.type,
          name: t.name,
          description: t.description,
          effect: t.effect,
          quantity: getTalismanQuantity(t.type),
          iconName: TALISMAN_ICON_MAP[t.type],
          tier: t.tier,
          materials: t.materials,
          buildingType: 'artifact_hall',
          shopItemId: shop?.id,
          buyPrice: shop?.price,
          sellPrice: shop?.sellPrice,
        };
      });
    }
    if (activeTab === 'beasts') {
      return Object.values(BEAST_CONFIGS).map(b => {
        const shop = SHOP_ITEMS.find(i => i.id === `beast:${b.type}`);
        return {
          id: b.type,
          name: b.name,
          description: b.description,
          effect: `战力+${b.combatPowerBonus}${b.lifespanBonus ? `，寿元+${b.lifespanBonus}` : ''}`,
          quantity: getBeastQuantity(b.type),
          iconName: BEAST_ICON_MAP[b.type],
          tierNum: b.tier,
          shopItemId: shop?.id,
          buyPrice: shop?.price,
          sellPrice: shop?.sellPrice,
        };
      });
    }
    // ========= 原材料 Tab：基础材料 + 特殊材料 =========
    const matItems: ItemData[] = [];
    // 基础材料
    for (const name of BASIC_MATERIAL_NAMES) {
      const info = MATERIAL_INFOS[name];
      let qty = 0;
      if (name === '灵草') qty = herbInventory;
      else if (name === '玄铁') qty = ironInventory;
      else if (name === '灵纸') qty = paperInventory;
      const shop = SHOP_ITEMS.find(i => i.id === `material:${name}`);
      matItems.push({
        id: `material:${name}`,
        name,
        description: info.description,
        effect: `用于${info.building ?? '对应堂口'}炼制${name === '灵草' ? '丹药' : name === '玄铁' ? '法器' : '符箓'}`,
        quantity: qty,
        iconName: info.iconName,
        shopItemId: shop?.id,
        buyPrice: shop?.price,
        sellPrice: shop?.sellPrice,
        isMaterial: true,
        materialName: name,
        referencePrice: Math.max(5, Math.floor((shop?.price ?? 10) * 0.8)),
      });
    }
    // 特殊材料
    for (const [name, cfg] of Object.entries(SPECIAL_MATERIAL_MAP)) {
      const shop = SHOP_ITEMS.find(i => i.id === `material:${name}`);
      const qty = specialMaterials[name] ?? 0;
      // 大致判断建议炼制去向：炼丹/炼器/制符
      const usedIn = (() => {
        const pillNeed = Object.values(PILL_CONFIGS).some(p => p.materials.some(m => m.name === name));
        const artiNeed = Object.values(ARTIFACT_CONFIGS).some(a => a.materials.some(m => m.name === name));
        const taliNeed = Object.values(TALISMAN_CONFIGS).some(t => t.materials.some(m => m.name === name));
        const arr: string[] = [];
        if (pillNeed) arr.push('丹堂');
        if (artiNeed) arr.push('炼器堂');
        if (taliNeed) arr.push('符堂');
        return arr.join(' / ') || '炼制材料';
      })();
      matItems.push({
        id: `material:${name}`,
        name,
        description: cfg.description,
        effect: `用于${usedIn}${cfg.source ? ` · 来源：${cfg.source}` : ''}`,
        quantity: qty,
        iconName: 'crystal',
        tier: cfg.rarity,
        shopItemId: shop?.id,
        buyPrice: shop?.price,
        sellPrice: shop?.sellPrice,
        isMaterial: true,
        materialName: name,
        referencePrice: Math.max(10, Math.floor((shop?.price ?? 50) * 0.8)),
      });
    }
    return matItems;
  }, [activeTab, pillInventory, artifactInventory, talismanInventory, beastInventory, herbInventory, ironInventory, paperInventory, specialMaterials]);

  const theme = TAB_THEME[activeTab];

  // 当前分类的 AI 图鉴大图路径（public/ 下，相对路径）
  const catalogImg = CATALOG_IMG[activeTab];

  const catalogTitle = activeTab === 'pills' ? '丹药库'
    : activeTab === 'artifacts' ? '炼器库'
    : activeTab === 'talismans' ? '符箓库'
    : activeTab === 'beasts' ? '灵兽苑'
    : '原材料库';

  return (
    <div className="warehouse-panel-layout">
      {/* 左侧类型导航 */}
      <nav className="warehouse-nav">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const t = TAB_THEME[tab.id];
          return (
            <button
              key={tab.id}
              className={`warehouse-nav-item ${isActive ? 'warehouse-nav-item-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <div className="warehouse-nav-icon-wrap">
                <SectIcon
                  name={tab.iconName}
                  size={18}
                  strokeWidth={1.8}
                  className={isActive ? t.color : 'text-[var(--ink-300)]'}
                />
              </div>
              <span className="warehouse-nav-label">{tab.label}</span>
              <span className="warehouse-nav-count">×{tab.count}</span>
            </button>
          );
        })}
      </nav>

      {/* 右侧主区 */}
      <div className="flex flex-col min-h-0 overflow-y-auto">
        {/* AI 图鉴大图条：使用 <img> 元素渲染，比 CSS background 在 file:// 协议下更可靠
            加载失败时隐藏 img，显示渐变背景兜底 */}
        <div
          className="warehouse-banner warehouse-banner-catalog"
          data-catalog-tab={activeTab}
          // key 强制切换 tab 时重建 img，避免缓存的 onerror
          key={`banner-${activeTab}-${imgRetryTick}`}
        >
          {!imgLoadFailed.current[catalogImg] && (
            <img
              src={catalogImg}
              alt={`${catalogTitle}图鉴`}
              className="warehouse-banner-img"
              loading="eager"
              decoding="async"
              // 注意：file:// 协议下不要加 crossOrigin / referrerPolicy，
              // 部分老版本 Android System WebView 会因此拒绝加载本地资源
              onLoad={() => { imgLoadFailed.current[catalogImg] = false; }}
              onError={() => {
                imgLoadFailed.current[catalogImg] = true;
                // 触发一次重渲染以显示渐变兜底
                setImgRetryTick(t => t + 1);
              }}
            />
          )}
          <div className="warehouse-banner-overlay">
            <div className="flex items-center gap-2">
              <SectIcon name="warehouse" size={16} className="text-[var(--gold-300)]" />
              <span className="warehouse-banner-title">{catalogTitle}</span>
            </div>
            <div className="warehouse-banner-sub">
              共 {items.length} 种 · 库存 {counts[activeTab]} 件
            </div>
          </div>
        </div>

        {/* 6 列物品网格 */}
        <div className="warehouse-grid">
          {items.map(item => {
            const isEmpty = item.quantity <= 0;
            return (
              <button
                key={item.id}
                type="button"
                className={`warehouse-item ${isEmpty ? 'warehouse-item-empty' : ''}`}
                // 点击/轻触弹出详情（替代 title hover，手机端可用）
                onClick={() => setSelectedItem(item)}
              >
                <div
                  className="warehouse-item-icon-wrap"
                  style={{ background: `radial-gradient(circle at center, ${theme.bg}, rgba(13, 17, 23, 0.6))` }}
                >
                  <SectIcon
                    name={item.iconName}
                    size={26}
                    strokeWidth={1.6}
                    className={theme.color}
                  />
                  {/* 品阶标签 */}
                  {item.tier && (
                    <span className="warehouse-item-tier">{TIER_LABEL[item.tier] || item.tier}</span>
                  )}
                  {item.tierNum && (
                    <span className="warehouse-item-tier">{item.tierNum}阶</span>
                  )}
                </div>
                <div className="warehouse-item-name">{item.name}</div>
                {/* 库存徽章 */}
                <span className={`warehouse-item-qty ${isEmpty ? 'warehouse-item-qty-zero' : ''}`}>
                  {item.quantity}
                </span>
              </button>
            );
          })}
        </div>

        {/* 底部灵石条 */}
        <div className="mt-3 pt-2 border-t border-[var(--gold-400)]/15 flex items-center justify-between text-[10px] text-[var(--ink-400)]">
          <span>提示：点击物品可查看详情</span>
          <span className="flex items-center gap-1">
            <SectIcon name="cultivate" size={11} className="text-sect-spirit" />
            <span className="text-sect-spirit font-bold">{Math.floor(spiritStones).toLocaleString()}</span>
            灵石
          </span>
        </div>
      </div>

      {/* 物品详情弹窗（手机端 tap / PC 端 click 通用） */}
      {selectedItem && (
        <div
          className="warehouse-detail-overlay"
          onClick={() => { setSelectedItem(null); setActionMode(null); setSelectedDiscipleId(null); setShowAutoTrade(false); }}
          role="button"
          aria-label="关闭详情"
        >
          <div
            className="warehouse-detail-card warehouse-detail-card--large"
            onClick={e => e.stopPropagation()}
            style={{ background: `radial-gradient(circle at top, ${theme.bg}, rgba(13, 17, 23, 0.95))` }}
          >
            <button
              type="button"
              className="warehouse-detail-close"
              onClick={() => { setSelectedItem(null); setActionMode(null); setSelectedDiscipleId(null); setShowAutoTrade(false); }}
              aria-label="关闭"
            >
              ✕
            </button>
            <div className="warehouse-detail-icon-row">
              <SectIcon name={selectedItem.iconName} size={44} strokeWidth={1.4} className={theme.color} />
              <div className="flex-1 min-w-0">
                <div className="warehouse-detail-name">{selectedItem.name}</div>
                <div className="warehouse-detail-meta">
                  {selectedItem.tier && <span>{TIER_LABEL[selectedItem.tier] || selectedItem.tier}</span>}
                  {selectedItem.tierNum && <span>{selectedItem.tierNum}阶</span>}
                  <span>库存 ×{selectedItem.quantity}</span>
                </div>
              </div>
            </div>
            <div className="warehouse-detail-desc">{selectedItem.description}</div>
            <div className="warehouse-detail-effect">
              <span className="warehouse-detail-effect-label">效果</span>
              <span className="warehouse-detail-effect-text">{selectedItem.effect}</span>
            </div>

            {/* 炼制配方：展示所需原材料 + 当前库存 */}
            {selectedItem.materials && selectedItem.materials.length > 0 && (
              <div className="warehouse-detail-recipe">
                <div className="warehouse-detail-recipe-label">
                  <SectIcon name="scrollText" size={12} className="text-sect-gold" />
                  炼制配方（每件消耗）
                </div>
                <div className="warehouse-detail-recipe-list">
                  {selectedItem.materials.map((m, idx) => {
                    // 获取当前库存
                    let stock = 0;
                    let isBasic = false;
                    if (m.name === '灵草') { stock = herbInventory; isBasic = true; }
                    else if (m.name === '玄铁' || m.name === '灵铁' || m.name === '矿石') { stock = ironInventory; isBasic = true; }
                    else if (m.name === '灵纸' || m.name === '符纸') { stock = paperInventory; isBasic = true; }
                    else { stock = specialMaterials[m.name] ?? 0; }
                    const enough = stock >= m.amount;
                    const matCfg = SPECIAL_MATERIAL_MAP[m.name];
                    return (
                      <div key={idx} className={`warehouse-recipe-mat ${enough ? 'is-enough' : 'is-lack'}`}>
                        <span className="warehouse-recipe-mat-name">
                          {m.name}
                          {matCfg && (
                            <span className={`warehouse-recipe-mat-rarity ${RARITY_COLOR[matCfg.rarity]}`}>
                              {RARITY_LABEL[matCfg.rarity]}
                            </span>
                          )}
                          {isBasic && <span className="warehouse-recipe-mat-tag">基础</span>}
                        </span>
                        <span className="warehouse-recipe-mat-amount">
                          需 {m.amount}
                          <span className="warehouse-recipe-mat-stock">（库存 {stock}）</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {selectedItem.buildingType && (
                  <div className="warehouse-detail-recipe-hint">
                    {selectedItem.buildingType === 'pill_hall' && '于丹堂设置生产目标后自动炼制'}
                    {selectedItem.buildingType === 'sutra_hall' && '于炼器堂设置生产目标后自动锻造'}
                    {selectedItem.buildingType === 'artifact_hall' && '于符堂设置生产目标后自动绘制'}
                    ；特殊材料可在坊市「材料」分类购买或秘境试炼掉落。
                  </div>
                )}
              </div>
            )}

            {/* ===== 快捷交易：直接买/卖（不用进入坊市） ===== */}
            {selectedItem.shopItemId && (
              <div className="wh-trade-block">
                <div className="wh-trade-title">
                  <SectIcon name="shop" size={13} className="text-sect-spirit" />
                  <span>快捷交易</span>
                </div>
                <div className="wh-trade-prices">
                  <div className="wh-trade-price">
                    <span className="wh-trade-price-label">买入</span>
                    <span className="wh-trade-price-value text-sect-spirit font-bold">
                      {selectedItem.buyPrice?.toLocaleString() ?? '—'} 灵石/件
                    </span>
                  </div>
                  <div className="wh-trade-price">
                    <span className="wh-trade-price-label">卖出</span>
                    <span className="wh-trade-price-value text-sect-gold font-bold">
                      {selectedItem.sellPrice?.toLocaleString() ?? '—'} 灵石/件
                    </span>
                  </div>
                </div>
                <div className="wh-trade-btns">
                  <button
                    type="button"
                    className="wh-trade-btn wh-trade-btn--buy"
                    disabled={!selectedItem.buyPrice || spiritStones < (selectedItem.buyPrice ?? 0)}
                    onClick={() => {
                      if (!selectedItem.shopItemId) return;
                      const r = buyShopItem(selectedItem.shopItemId);
                      showToast(
                        r.success
                          ? `购入「${selectedItem.name}」1 件，花费 ${selectedItem.buyPrice} 灵石`
                          : `买入失败：${r.reason || '未知'}`,
                      );
                    }}
                  >
                    <SectIcon name="plus" size={12} />
                    <span>买入 1 件</span>
                  </button>
                  <button
                    type="button"
                    className="wh-trade-btn wh-trade-btn--sell"
                    disabled={selectedItem.quantity <= 0}
                    onClick={() => {
                      if (!selectedItem.shopItemId) return;
                      const r = sellShopItem(selectedItem.shopItemId);
                      showToast(
                        r.success
                          ? `售出「${selectedItem.name}」1 件，获得 +${r.gain} 灵石`
                          : `卖出失败：${r.reason || '未知'}`,
                      );
                    }}
                  >
                    <SectIcon name="minus" size={12} />
                    <span>卖出 1 件</span>
                  </button>
                </div>

                {/* 自动交易展开入口 */}
                <button
                  type="button"
                  className={`wh-autotrade-toggle ${showAutoTrade ? 'is-open' : ''}`}
                  onClick={() => setShowAutoTrade(v => !v)}
                >
                  <SectIcon name="gear" size={12} />
                  <span>自动交易设置（低于阈值买入 / 高于阈值卖出）</span>
                  <SectIcon name={showAutoTrade ? 'chevronUp' : 'chevronDown'} size={12} />
                </button>

                {/* 自动交易设置面板 */}
                {showAutoTrade && (() => {
                  const rule: AutoTradeRule | undefined = autoTrade[selectedItem.shopItemId!];
                  const enabled = rule?.enabled ?? false;
                  const buyBelow = rule?.buyBelow ?? 0;
                  const sellAbove = rule?.sellAbove ?? 0;
                  const monthlyBuyQty = rule?.monthlyBuyQty ?? 1;
                  const monthlySellQty = rule?.monthlySellQty ?? 1;
                  return (
                    <div className="wh-autotrade-panel">
                      <label className="wh-autotrade-row wh-autotrade-row--enable">
                        <span className="wh-autotrade-label">启用自动交易</span>
                        <button
                          type="button"
                          className={`wh-switch ${enabled ? 'is-on' : ''}`}
                          onClick={() => toggleAutoTrade(selectedItem.shopItemId!, !enabled)}
                        >
                          <span className="wh-switch-knob" />
                        </button>
                      </label>
                      <div className={`wh-autotrade-body ${enabled ? '' : 'is-disabled'}`}>
                        <label className="wh-autotrade-row">
                          <span className="wh-autotrade-label">
                            <span className="wh-dot wh-dot--buy" />
                            库存少于
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={!enabled}
                            value={buyBelow || ''}
                            placeholder="0=关闭"
                            onChange={e => {
                              const v = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                              setAutoTradeRule(selectedItem.shopItemId!, { buyBelow: v });
                            }}
                            className="wh-number-input"
                          />
                          <span className="wh-autotrade-suffix">件时每月买入</span>
                          <input
                            type="number"
                            min={1}
                            disabled={!enabled}
                            value={monthlyBuyQty}
                            onChange={e => {
                              const v = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                              setAutoTradeRule(selectedItem.shopItemId!, { monthlyBuyQty: v });
                            }}
                            className="wh-number-input wh-number-input--sm"
                          />
                          <span className="wh-autotrade-suffix">件</span>
                        </label>
                        <label className="wh-autotrade-row">
                          <span className="wh-autotrade-label">
                            <span className="wh-dot wh-dot--sell" />
                            库存多于
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={!enabled}
                            value={sellAbove || ''}
                            placeholder="0=关闭"
                            onChange={e => {
                              const v = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                              setAutoTradeRule(selectedItem.shopItemId!, { sellAbove: v });
                            }}
                            className="wh-number-input"
                          />
                          <span className="wh-autotrade-suffix">件时每月卖出</span>
                          <input
                            type="number"
                            min={1}
                            disabled={!enabled}
                            value={monthlySellQty}
                            onChange={e => {
                              const v = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                              setAutoTradeRule(selectedItem.shopItemId!, { monthlySellQty: v });
                            }}
                            className="wh-number-input wh-number-input--sm"
                          />
                          <span className="wh-autotrade-suffix">件</span>
                        </label>
                        <div className="wh-autotrade-tip">
                          例：买入阈值填 5，则库存 ≤4 时每月最多买入设定件数；卖出阈值填 20，则库存 ≥21 时每月卖出。填 0 表示关闭该方向。
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========== 原材料兑换表单 ========== */}
            {selectedItem.isMaterial && selectedItem.materialName && selectedItem.quantity > 0 && (
              <div className="wh-trade-block">
                <div className="wh-trade-title">
                  <SectIcon name="gem" size={13} className="text-emerald-300" />
                  <span>弟子兑换（花贡献 · 转入弟子背包 · 自行前往堂口炼制）</span>
                </div>
                <div className="space-y-1.5">
                  <div className="wh-input-row" style={{ flexDirection: 'row', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="wh-input-label" style={{ minWidth: 80, flexShrink: 0 }}>兑换数量</span>
                    <input
                      type="number"
                      min={1}
                      value={matQty}
                      onChange={e => setMatQty(e.target.value)}
                      className="wh-number-input"
                      style={{ flex: 1 }}
                      placeholder="1"
                    />
                    <span className="wh-input-label" style={{ whiteSpace: 'nowrap', fontSize: 10, color: 'var(--ink-400)' }}>
                      (库存 {selectedItem.quantity})
                    </span>
                  </div>
                  <div className="wh-input-row" style={{ flexDirection: 'row', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="wh-input-label" style={{ minWidth: 80, flexShrink: 0 }}>花费贡献</span>
                    <input
                      type="number"
                      min={0}
                      value={matContrib}
                      onChange={e => setMatContrib(e.target.value)}
                      className="wh-number-input"
                      style={{ flex: 1 }}
                      placeholder={`参考 ${selectedItem.referencePrice ?? 20}/件`}
                    />
                    {selectedItem.referencePrice && (
                      <button
                        type="button"
                        className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
                        onClick={() => {
                          const q = Math.max(1, parseInt(matQty || '1', 10) || 1);
                          setMatContrib(String(q * selectedItem.referencePrice!));
                        }}
                      >
                        按参考×数量
                      </button>
                    )}
                  </div>
                  {/* 选弟子 + 确认 */}
                  <div className="wh-disciple-picker mt-1.5">
                    <div className="wh-input-label mb-1">选择弟子（转入其背包，前往堂口炼制）</div>
                    <div className="wh-disciple-scroll">
                      {disciples.length === 0 && <div className="wh-empty-tip">暂无可分配弟子</div>}
                      {disciples.map(d => {
                        const selected = selectedDiscipleId === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            className={`wh-disciple-chip ${selected ? 'is-selected' : ''}`}
                            onClick={() => setSelectedDiscipleId(d.id)}
                          >
                            <span className="wh-disciple-chip-name">{d.name}</span>
                            <span className="wh-disciple-chip-info">
                              {getRealmDisplay(d)} · 贡献{d.contributionPoints}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wh-action-confirm"
                    disabled={!selectedDiscipleId}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      if (!selectedDiscipleId || !selectedItem.materialName) return;
                      const q = Math.max(1, parseInt(matQty || '1', 10) || 1);
                      const cost = Math.max(0, parseInt(matContrib || '0', 10) || 0);
                      const r = exchangeMaterialByDisciple(selectedDiscipleId, selectedItem.materialName, q, cost);
                      showToast(
                        r.ok
                          ? `兑换成功：${disciples.find(x => x.id === selectedDiscipleId)?.name} 花 ${cost} 贡献得「${selectedItem.materialName}」×${q}`
                          : `兑换失败：${r.reason || '未知'}`,
                      );
                      if (r.ok) {
                        setActionMode(null);
                        setSelectedDiscipleId(null);
                      }
                    }}
                  >
                    确认兑换原材料（扣贡献 → 转入弟子背包）
                  </button>
                </div>
              </div>
            )}

            {/* 兑换 / 赠送 按钮（库存为 0 时禁用，原材料不使用） */}
            {selectedItem.quantity > 0 && !selectedItem.isMaterial && (
              <div className="wh-action-row">
                <button
                  type="button"
                  className={`wh-action-btn wh-action-btn--exchange ${actionMode === 'exchange' ? 'is-active' : ''}`}
                  onClick={() => { setActionMode(actionMode === 'exchange' ? null : 'exchange'); setSelectedDiscipleId(null); }}
                >
                  <SectIcon name="gem" size={13} />
                  <span>弟子兑换</span>
                </button>
                <button
                  type="button"
                  className={`wh-action-btn wh-action-btn--gift ${actionMode === 'gift' ? 'is-active' : ''}`}
                  onClick={() => { setActionMode(actionMode === 'gift' ? null : 'gift'); setSelectedDiscipleId(null); }}
                >
                  <SectIcon name="crystal" size={13} />
                  <span>赠送弟子</span>
                </button>
              </div>
            )}

            {/* 展开区：输入贡献值/满意度 + 选弟子 + 执行按钮 */}
            {actionMode && selectedItem.quantity > 0 && (
              <div className="wh-action-panel">
                {actionMode === 'exchange' && (
                  <label className="wh-input-row">
                    <span className="wh-input-label">需花贡献（手动输入）</span>
                    <input
                      type="number"
                      min={0}
                      value={inputContribution}
                      onChange={e => setInputContribution(e.target.value)}
                      className="wh-number-input"
                      placeholder="输入贡献值，如 50"
                    />
                  </label>
                )}
                {actionMode === 'gift' && (
                  <label className="wh-input-row">
                    <span className="wh-input-label">加满意度（空=按物品种类默认）</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={inputSatisfaction}
                      onChange={e => setInputSatisfaction(e.target.value)}
                      className="wh-number-input"
                      placeholder="默认：丹/符10 / 器15 / 兽20"
                    />
                  </label>
                )}

                {/* 选弟子 */}
                <div className="wh-disciple-picker">
                  <div className="wh-input-label mb-1">选择弟子</div>
                  <div className="wh-disciple-scroll">
                    {disciples.length === 0 && (
                      <div className="wh-empty-tip">暂无可分配弟子</div>
                    )}
                    {disciples.map(d => {
                      const selected = selectedDiscipleId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`wh-disciple-chip ${selected ? 'is-selected' : ''}`}
                          onClick={() => setSelectedDiscipleId(d.id)}
                        >
                          <span className="wh-disciple-chip-name">{d.name}</span>
                          <span className="wh-disciple-chip-info">
                            {getRealmDisplay(d)} · 贡献{d.contributionPoints} · 满意{d.satisfaction}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="wh-action-confirm"
                  disabled={!selectedDiscipleId}
                  onClick={() => {
                    if (!selectedDiscipleId || !selectedItem) return;
                    const kind: 'pill' | 'artifact' | 'talisman' | 'beast' =
                      activeTab === 'pills' ? 'pill' :
                      activeTab === 'artifacts' ? 'artifact' :
                      activeTab === 'talismans' ? 'talisman' : 'beast';
                    if (actionMode === 'exchange') {
                      const cost = Math.max(0, parseInt(inputContribution || '0', 10) || 0);
                      const r = exchangeItemByDisciple(selectedDiscipleId, kind, selectedItem.id, cost);
                      showToast(r.ok ? `兑换成功：${disciples.find(x => x.id === selectedDiscipleId)?.name} 花 ${cost} 贡献得 ${selectedItem.name}` : `兑换失败：${r.reason || '未知'}`);
                    } else {
                      const bonus = inputSatisfaction.trim() !== ''
                        ? Math.max(0, Math.min(100, parseInt(inputSatisfaction, 10) || 0))
                        : undefined;
                      const r = giftItemToDisciple(selectedDiscipleId, kind, selectedItem.id, bonus);
                      showToast(r.ok ? `赠送成功：${disciples.find(x => x.id === selectedDiscipleId)?.name} 收到 ${selectedItem.name}` : `赠送失败：${r.reason || '未知'}`);
                    }
                    setActionMode(null);
                    setSelectedDiscipleId(null);
                  }}
                >
                  {actionMode === 'exchange' ? '确认兑换（扣贡献）' : '确认赠送（加满意度）'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && <div className="wh-toast">{toastMsg}</div>}
    </div>
  );
};
