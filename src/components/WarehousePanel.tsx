import React, { useState, useMemo, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';
import { SPECIAL_MATERIAL_MAP, RARITY_LABEL, RARITY_COLOR } from '@/data/specialMaterials';
import type { PillType } from '@/types/pill';
import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
import type { BeastType } from '@/types/beast';
import type { IconName } from '@/components/icons/SectIcons';
import { SectIcon } from '@/components/icons/SectIcons';
import type { Disciple } from '@/types/disciple';
import { getRealmDisplay } from '@/types/disciple';

// 图鉴大图：放在 public/ 根目录，构建后 dist/ 下与 index.html 同级。
// 使用相对路径 ./catalog-xxx.jpg，file:// 协议下也能正常解析
// （Capacitor Android 加载 file:///android_asset/public/index.html，
//  ./catalog-pills.jpg → file:///android_asset/public/catalog-pills.jpg，真实存在）
const CATALOG_IMG: Record<WarehouseTab, string> = {
  pills: './catalog-pills.jpg',
  artifacts: './catalog-artifacts.jpg',
  talismans: './catalog-talismans.jpg',
  beasts: './catalog-beasts.jpg',
};

type WarehouseTab = 'pills' | 'artifacts' | 'talismans' | 'beasts';

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
}

export const WarehousePanel: React.FC = () => {
  const {
    pillInventory, artifactInventory, talismanInventory, beastInventory, spiritStones,
    herbInventory, ironInventory, paperInventory, specialMaterials,
    disciples, exchangeItemByDisciple, giftItemToDisciple,
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

  // 各分类总数
  const counts = useMemo(() => ({
    pills: pillInventory.reduce((s, p) => s + p.quantity, 0),
    artifacts: artifactInventory.reduce((s, a) => s + a.quantity, 0),
    talismans: talismanInventory.reduce((s, t) => s + t.quantity, 0),
    beasts: beastInventory.reduce((s, b) => s + b.quantity, 0),
  }), [pillInventory, artifactInventory, talismanInventory, beastInventory]);

  const tabs: { id: WarehouseTab; label: string; iconName: IconName; count: number }[] = [
    { id: 'pills', label: '丹药', iconName: 'pill', count: counts.pills },
    { id: 'artifacts', label: '法器', iconName: 'sword', count: counts.artifacts },
    { id: 'talismans', label: '符箓', iconName: 'scrollText', count: counts.talismans },
    { id: 'beasts', label: '灵兽', iconName: 'talisman', count: counts.beasts },
  ];

  // 当前分类所有物品（包括库存为 0 的，全部展示）
  const items: ItemData[] = useMemo(() => {
    if (activeTab === 'pills') {
      return Object.values(PILL_CONFIGS).map(p => ({
        id: p.type,
        name: p.name,
        description: p.description,
        effect: p.effect,
        quantity: getPillQuantity(p.type),
        iconName: PILL_ICON_MAP[p.type],
        materials: p.materials,
        buildingType: 'pill_hall',
      }));
    }
    if (activeTab === 'artifacts') {
      return Object.values(ARTIFACT_CONFIGS).map(a => ({
        id: a.type,
        name: a.name,
        description: a.description,
        effect: a.effect,
        quantity: getArtifactQuantity(a.type),
        iconName: ARTIFACT_ICON_MAP[a.type],
        tier: a.tier,
        materials: a.materials,
        buildingType: 'sutra_hall',
      }));
    }
    if (activeTab === 'talismans') {
      return Object.values(TALISMAN_CONFIGS).map(t => ({
        id: t.type,
        name: t.name,
        description: t.description,
        effect: t.effect,
        quantity: getTalismanQuantity(t.type),
        iconName: TALISMAN_ICON_MAP[t.type],
        tier: t.tier,
        materials: t.materials,
        buildingType: 'artifact_hall',
      }));
    }
    return Object.values(BEAST_CONFIGS).map(b => ({
      id: b.type,
      name: b.name,
      description: b.description,
      effect: `战力+${b.combatPowerBonus}${b.lifespanBonus ? `，寿元+${b.lifespanBonus}` : ''}`,
      quantity: getBeastQuantity(b.type),
      iconName: BEAST_ICON_MAP[b.type],
      tierNum: b.tier,
    }));
  }, [activeTab, pillInventory, artifactInventory, talismanInventory, beastInventory]);

  const theme = TAB_THEME[activeTab];

  // 当前分类的 AI 图鉴大图路径（public/ 下，相对路径）
  const catalogImg = CATALOG_IMG[activeTab];

  const catalogTitle = activeTab === 'pills' ? '丹药库'
    : activeTab === 'artifacts' ? '炼器库'
    : activeTab === 'talismans' ? '符箓库'
    : '灵兽苑';

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
          onClick={() => { setSelectedItem(null); setActionMode(null); setSelectedDiscipleId(null); }}
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
              onClick={() => { setSelectedItem(null); setActionMode(null); setSelectedDiscipleId(null); }}
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

            {/* 兑换 / 赠送 按钮（库存为 0 时禁用） */}
            {selectedItem.quantity > 0 && (
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
