import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  BookTierNames, BookAttributeNames,
  type BookConfig, type BookTier, type BookType
} from '@/data/buildings';
import { RealmOrder, RealmNames, DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import {
  BookOpen, Sword, Sparkles, Lock, Trash2, Clock, User, ShoppingCart, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canLearnBook as checkRootMatch, getBookPrice } from '@/utils/bookGenerator';
import { SectIcon } from '@/components/icons/SectIcons';
import { MiniAvatar, SimpleAvatar } from '@/components/ui/Avatar';

interface LibraryPanelProps {
  buildingId: string;
}

// 每层的视觉主题
const TIER_THEME: Record<BookTier, {
  label: string;       // 一层 / 二层 ...
  realm: string;       // 对应境界
  accent: string;      // 主色
  accentBg: string;    // 背景色
  glow: string;        // 光晕色
  border: string;      // 边框色
  gradient: string;    // 渐变
  bookCard: string;    // 书籍卡片渐变
}> = {
  qi: {
    label: '一层',
    realm: '炼气',
    accent: 'text-emerald-300',
    accentBg: 'bg-emerald-500/15',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.25)]',
    border: 'border-emerald-500/40',
    gradient: 'from-emerald-900/40 via-emerald-800/20 to-transparent',
    bookCard: 'from-emerald-900/40 to-teal-900/20 border-emerald-500/30',
  },
  foundation: {
    label: '二层',
    realm: '筑基',
    accent: 'text-cyan-300',
    accentBg: 'bg-cyan-500/15',
    glow: 'shadow-[0_0_24px_rgba(6,182,212,0.25)]',
    border: 'border-cyan-500/40',
    gradient: 'from-cyan-900/40 via-blue-800/20 to-transparent',
    bookCard: 'from-blue-900/40 to-cyan-900/20 border-blue-500/30',
  },
  golden: {
    label: '三层',
    realm: '金丹',
    accent: 'text-amber-300',
    accentBg: 'bg-amber-500/15',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.3)]',
    border: 'border-amber-500/40',
    gradient: 'from-amber-900/40 via-yellow-800/20 to-transparent',
    bookCard: 'from-amber-900/40 to-yellow-900/20 border-amber-500/30',
  },
  nascent: {
    label: '四层',
    realm: '元婴',
    accent: 'text-purple-300',
    accentBg: 'bg-purple-500/15',
    glow: 'shadow-[0_0_28px_rgba(168,85,247,0.3)]',
    border: 'border-purple-500/40',
    gradient: 'from-purple-900/40 via-indigo-800/20 to-transparent',
    bookCard: 'from-purple-900/40 to-indigo-900/20 border-purple-500/30',
  },
};

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ buildingId }) => {
  const {
    disciples, buildings, learnBook, forgetBook, getDiscipleById,
    libraryBooks, libraryCosts, buyRandomBook, setLibraryCost, spiritStones
  } = useGameStore();

  const [selectedTier, setSelectedTier] = useState<BookTier>('qi');
  const [selectedDiscipleId, setSelectedDiscipleId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lastBoughtBook, setLastBoughtBook] = useState<BookConfig | null>(null);

  const building = buildings.find(b => b.id === buildingId);
  const assignedDisciples = building
    ? disciples.filter(d => building.assignedDisciples.includes(d.id))
    : [];

  const selectedDisciple = disciples.find(d => d.id === selectedDiscipleId);

  // 根据藏经阁等级解锁的层数
  const unlockedTier = (() => {
    const level = building?.level || 1;
    const tiers: BookTier[] = ['qi', 'foundation', 'golden', 'nascent'];
    return tiers[Math.min(level - 1, 3)];
  })();

  const allTiers: BookTier[] = ['qi', 'foundation', 'golden', 'nascent'];

  const isTierUnlocked = (tier: BookTier): boolean => {
    return allTiers.indexOf(tier) <= allTiers.indexOf(unlockedTier);
  };

  const techniqueBooks = libraryBooks.filter(book => book.tier === selectedTier && book.type === 'technique');
  const battleBooks = libraryBooks.filter(book => book.tier === selectedTier && book.type === 'battle');

  const canLearnCheck = (book: BookConfig, discipleId: string): { canLearn: boolean; reason: string } => {
    const disciple = getDiscipleById(discipleId);
    if (!disciple) return { canLearn: false, reason: '弟子不存在' };
    if (disciple.learningBook) return { canLearn: false, reason: '正在学习其他书籍' };

    const tierRealmMap: Record<BookTier, number> = {
      qi: RealmOrder.indexOf('qi'),
      foundation: RealmOrder.indexOf('foundation'),
      golden: RealmOrder.indexOf('golden'),
      nascent: RealmOrder.indexOf('nascent'),
    };
    const discipleRealmIndex = RealmOrder.indexOf(disciple.realm);
    if (discipleRealmIndex < tierRealmMap[book.tier]) {
      return { canLearn: false, reason: `需要${RealmNames[RealmOrder[tierRealmMap[book.tier]]]}以上` };
    }

    const spiritRoots = disciple.hiddenTalents.spiritRoots || [];
    if (!checkRootMatch(spiritRoots, book)) {
      return { canLearn: false, reason: `灵根不符（需${BookAttributeNames[book.attribute]}）` };
    }

    const cost = libraryCosts[book.tier];
    if (disciple.contributionPoints < cost) {
      return { canLearn: false, reason: `贡献点不足（需${cost}）` };
    }
    if (book.type === 'technique' && disciple.learnedTechnique) {
      return { canLearn: false, reason: '已学功法（请先遗忘）' };
    }
    if (book.type === 'battle' && disciple.learnedBattles.length >= 2) {
      return { canLearn: false, reason: '已学2本战技' };
    }
    return { canLearn: true, reason: '可以学习' };
  };

  const handleLearn = (bookId: string) => {
    if (!selectedDiscipleId) return;
    learnBook(selectedDiscipleId, bookId);
  };
  const handleForget = (bookType: BookType, bookId: string) => {
    if (!selectedDiscipleId) return;
    forgetBook(selectedDiscipleId, bookType, bookId);
  };
  const handleBuyBook = (tier: BookTier) => {
    const book = buyRandomBook(tier);
    if (book) {
      setLastBoughtBook(book);
      setTimeout(() => setLastBoughtBook(null), 3000);
    }
  };

  const getQualityText = (quality: number) => {
    if (quality >= 90) return '仙品';
    if (quality >= 80) return '极品';
    if (quality >= 60) return '上品';
    if (quality >= 40) return '中品';
    return '下品';
  };
  const getAttributeColor = (attr: string) => {
    const colors: Record<string, string> = {
      gold: 'text-yellow-400', wood: 'text-green-400', water: 'text-blue-400',
      fire: 'text-red-400', earth: 'text-amber-600', thunder: 'text-purple-400',
      wind: 'text-cyan-400', ice: 'text-cyan-200', universal: 'text-sect-gold',
    };
    return colors[attr] || 'text-gray-400';
  };

  const theme = TIER_THEME[selectedTier];

  // 渲染单本书籍卡片
  const renderBookCard = (book: BookConfig) => {
    const { canLearn, reason } = selectedDisciple
      ? canLearnCheck(book, selectedDisciple.id)
      : { canLearn: false, reason: '请先选择弟子' };
    const matchedRoots = selectedDisciple
      ? selectedDisciple.hiddenTalents.spiritRoots.filter(r => r.type === book.attribute)
      : [];

    return (
      <div key={book.id} className={cn(
        'relative overflow-hidden rounded-lg border bg-gradient-to-br transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-lg',
        theme.bookCard,
        !canLearn && selectedDisciple && 'opacity-75'
      )}>
        {/* 顶部装饰线 */}
        <div className={cn('absolute top-0 left-0 right-0 h-0.5 opacity-60', theme.accentBg)} />

        <div className="p-3 pt-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-lg',
                book.type === 'technique' ? 'bg-violet-500/20' : 'bg-red-500/20'
              )}>
                {book.type === 'technique'
                  ? <BookOpen size={18} className="text-violet-300" />
                  : <Sword size={18} className="text-red-300" />
                }
              </div>
              <div>
                <h4 className="font-display text-sm text-sect-jade leading-tight">{book.name}</h4>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  <span className={cn('text-[10px] px-1 rounded', getAttributeColor(book.attribute), 'bg-sect-ink/50')}>
                    {BookAttributeNames[book.attribute]}
                  </span>
                  <span className="text-[10px] px-1 rounded bg-sect-gold/10 text-sect-gold">
                    {getQualityText(book.quality)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 属性加成 */}
          <div className="flex flex-wrap gap-1 mb-2 text-[10px]">
            {book.cultivationBonus > 0 && (
              <span className="text-emerald-300">修炼+{book.cultivationBonus}%</span>
            )}
            {book.combatBonus > 0 && (
              <span className="text-red-300">战力+{book.combatBonus}%</span>
            )}
            <span className="text-blue-300">{book.learnDays}月</span>
            <span className="text-amber-300">{libraryCosts[book.tier]}贡献</span>
          </div>

          {/* 灵根匹配 */}
          {selectedDisciple && book.attribute !== 'universal' && matchedRoots.length === 0 && (
            <div className="mb-2 text-[10px] text-red-400 flex items-center gap-1">
              <SectIcon name="close" size={10} strokeWidth={2} />
              灵根不符
            </div>
          )}
          {selectedDisciple && book.attribute === 'universal' && (
            <div className="mb-2 text-[10px] text-sect-gold">通用·皆可习</div>
          )}

          <Tooltip content={reason}>
            <Button
              variant={canLearn ? 'gold' : 'ghost'}
              size="sm"
              className="w-full text-xs"
              onClick={() => handleLearn(book.id)}
              disabled={!canLearn}
            >
              {canLearn ? '修炼' : reason}
            </Button>
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ===== Hero 横幅 ===== */}
      <div className="relative h-32 rounded-xl overflow-hidden border border-sect-gold/30">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/library/library-hero.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sect-ink via-sect-ink/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <h2 className="font-display text-2xl text-sect-gold tracking-wider flex items-center gap-2">
            <BookOpen size={24} />
            藏经阁
          </h2>
          <p className="text-xs text-sect-jade/70 mt-0.5">
            四层楼阁 · 收录万卷功法战技 · 当前 Lv.{building?.level || 1}
          </p>
        </div>
      </div>

      {/* ===== 工具栏：弟子选择 + 设置 ===== */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User size={16} className="text-sect-gold shrink-0" />
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {assignedDisciples.length === 0 ? (
              <span className="text-xs text-sect-jade/40">暂无弟子在藏经阁</span>
            ) : assignedDisciples.map(disciple => (
              <button
                key={disciple.id}
                onClick={() => setSelectedDiscipleId(selectedDiscipleId === disciple.id ? null : disciple.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md border text-xs transition-all flex items-center gap-1.5',
                  selectedDiscipleId === disciple.id
                    ? 'bg-sect-gold/20 border-sect-gold text-sect-gold'
                    : 'border-sect-gold/20 text-sect-jade/70 hover:border-sect-gold/40'
                )}
              >
                <MiniAvatar seed={disciple.avatarSeed} size={20} status={disciple.status} realm={disciple.realm} name={disciple.name} />
                {disciple.name}
                {disciple.learningBook && <span className="w-1.5 h-1.5 rounded-full bg-spirit-400 animate-pulse" />}
              </button>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={16} />
        </Button>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="bg-sect-gold/5 border border-sect-gold/30 rounded-lg p-3 space-y-2">
          {allTiers.map(tier => {
            if (!isTierUnlocked(tier)) return null;
            return (
              <div key={tier} className="flex items-center justify-between text-xs">
                <span className="text-sect-jade/80">{TIER_THEME[tier].label}学习贡献</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setLibraryCost(tier, Math.max(0, libraryCosts[tier] - 50))}>-</Button>
                  <span className="w-12 text-center font-display text-sect-gold">{libraryCosts[tier]}</span>
                  <Button variant="ghost" size="sm" onClick={() => setLibraryCost(tier, libraryCosts[tier] + 50)}>+</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 四层楼阁导航 ===== */}
      <div className="grid grid-cols-4 gap-2">
        {allTiers.map((tier) => {
          const t = TIER_THEME[tier];
          const unlocked = isTierUnlocked(tier);
          const bookCount = libraryBooks.filter(b => b.tier === tier).length;
          const isActive = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => unlocked && setSelectedTier(tier)}
              disabled={!unlocked}
              className={cn(
                'relative rounded-lg border p-3 text-center transition-all overflow-hidden',
                isActive
                  ? cn(t.accentBg, t.border, t.glow, 'scale-105')
                  : unlocked
                    ? 'border-sect-gold/15 hover:border-sect-gold/30 bg-sect-ink/40'
                    : 'border-gray-700 bg-sect-ink/20 cursor-not-allowed'
              )}
            >
              {/* 渐变背景 */}
              {isActive && <div className={cn('absolute inset-0 bg-gradient-to-b', t.gradient)} />}
              <div className="relative">
                <div className={cn('font-display text-lg', unlocked ? t.accent : 'text-gray-600')}>
                  {unlocked ? t.label : <Lock size={16} className="mx-auto" />}
                </div>
                <div className={cn('text-[10px] mt-0.5', unlocked ? 'text-sect-jade/60' : 'text-gray-700')}>
                  {unlocked ? t.realm : '未解锁'}
                </div>
                {unlocked && (
                  <div className={cn('text-[10px] mt-1', isActive ? t.accent : 'text-sect-jade/40')}>
                    {bookCount}卷
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== 购买书籍 ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <ShoppingCart size={14} className="text-purple-300" />
        <span className="text-xs text-sect-jade/60 mr-1">购书</span>
        <span className="text-xs text-purple-400/60 mr-2">灵石 {Math.floor(spiritStones)}</span>
        {allTiers.map(tier => {
          const unlocked = isTierUnlocked(tier);
          const price = getBookPrice(tier);
          const canBuy = unlocked && spiritStones >= price;
          return (
            <Tooltip key={tier} content={unlocked ? `${price}灵石` : '层数未解锁'}>
              <Button
                variant={canBuy ? 'gold' : 'ghost'}
                size="sm"
                onClick={() => canBuy && handleBuyBook(tier)}
                disabled={!canBuy}
                className="text-xs"
              >
                {TIER_THEME[tier].label}·{price}
              </Button>
            </Tooltip>
          );
        })}
      </div>

      {lastBoughtBook && (
        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40 animate-pulse text-xs text-purple-200 flex items-center gap-2">
          <Sparkles size={12} />
          获得：<span className="font-display text-purple-100">{lastBoughtBook.name}</span>
          <Badge variant="spirit" size="sm">{BookTierNames[lastBoughtBook.tier]}</Badge>
        </div>
      )}

      {/* ===== 选中弟子状态 ===== */}
      {selectedDisciple && (
        <div className="bg-sect-gold/5 border border-sect-gold/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SimpleAvatar seed={selectedDisciple.avatarSeed} size={36} status={selectedDisciple.status} realm={selectedDisciple.realm} name={selectedDisciple.name} />
              <div>
                <div className="font-display text-sm text-sect-gold">{selectedDisciple.name}</div>
                <div className="text-[10px] text-sect-jade/60">
                  {DiscipleStatusNames[selectedDisciple.status]} · {getRealmDisplay(selectedDisciple)} · 贡献 {Math.floor(selectedDisciple.contributionPoints)}
                </div>
              </div>
            </div>
          </div>

          {selectedDisciple.learningBook && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 mb-2">
              <div className="flex items-center justify-between mb-1 text-xs text-purple-300">
                <span className="flex items-center gap-1"><Clock size={12} /> 学习中：{selectedDisciple.learningBook.name}</span>
                <span>{Math.floor(selectedDisciple.learningBook.progress)}%</span>
              </div>
              <ProgressBar value={selectedDisciple.learningBook.progress} max={100} color="spirit" />
            </div>
          )}

          {/* 已学功法/战技 */}
          <div className="flex flex-wrap gap-1.5">
            {selectedDisciple.learnedTechnique ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <BookOpen size={10} /> {selectedDisciple.learnedTechnique.name}
                <button onClick={() => handleForget('technique', selectedDisciple.learnedTechnique!.bookId)}>
                  <Trash2 size={10} className="text-red-400 hover:text-red-300" />
                </button>
              </span>
            ) : <span className="text-[10px] text-sect-jade/30">未习功法</span>}
            {selectedDisciple.learnedBattles.map(b => (
              <span key={b.bookId} className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
                <Sword size={10} /> {b.name}
                <button onClick={() => handleForget('battle', b.bookId)}>
                  <Trash2 size={10} className="text-red-400 hover:text-red-300" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== 双栏：功法 | 战技 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 功法栏 */}
        <div className={cn('rounded-xl border p-3', theme.border, 'bg-sect-ink/30')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn('font-display text-sm flex items-center gap-1.5', theme.accent)}>
              <BookOpen size={16} />
              功法
              <span className="text-[10px] text-sect-jade/40">（修炼+战力）</span>
            </h3>
            <span className="text-[10px] text-sect-jade/40">{techniqueBooks.length}卷</span>
          </div>
          {techniqueBooks.length === 0 ? (
            <div className="text-center py-6 text-sect-jade/30 text-xs">
              <BookOpen size={24} className="mx-auto mb-1 opacity-40" />
              此层暂无功法
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {techniqueBooks.map(renderBookCard)}
            </div>
          )}
        </div>

        {/* 战技栏 */}
        <div className={cn('rounded-xl border p-3', theme.border, 'bg-sect-ink/30')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn('font-display text-sm flex items-center gap-1.5', theme.accent)}>
              <Sword size={16} />
              战技
              <span className="text-[10px] text-sect-jade/40">（战力）</span>
            </h3>
            <span className="text-[10px] text-sect-jade/40">{battleBooks.length}卷</span>
          </div>
          {battleBooks.length === 0 ? (
            <div className="text-center py-6 text-sect-jade/30 text-xs">
              <Sword size={24} className="mx-auto mb-1 opacity-40" />
              此层暂无战技
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {battleBooks.map(renderBookCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
