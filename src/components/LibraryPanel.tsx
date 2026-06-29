import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tooltip } from '@/components/ui/Tooltip';
import { 
  BookTierNames, BookTypeNames, BookAttributeNames,
  type BookConfig, type BookTier, type BookType
} from '@/data/buildings';
import { RealmOrder, RealmNames, DiscipleStatusNames, SpiritRootNames } from '@/types/disciple';
import { 
  BookOpen, Sword, Sparkles, Lock, ChevronDown, ChevronUp,
  Trash2, Clock, Star, User, ShoppingCart, Settings, Gem
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canLearnBook as checkRootMatch, getBookPrice } from '@/utils/bookGenerator';

interface LibraryPanelProps {
  buildingId: string;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ buildingId }) => {
  const { 
    disciples, buildings, learnBook, forgetBook, getDiscipleById,
    libraryBooks, libraryCosts, buyRandomBook, setLibraryCost, spiritStones
  } = useGameStore();
  
  const [selectedTier, setSelectedTier] = useState<BookTier>('foundation');
  const [selectedType, setSelectedType] = useState<BookType>('technique');
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
    const tiers: BookTier[] = ['foundation', 'golden', 'nascent', 'spirit'];
    return tiers[Math.min(level - 1, 3)];
  })();
  
  const allTiers: BookTier[] = ['foundation', 'golden', 'nascent', 'spirit'];
  
  const filteredBooks = libraryBooks.filter(book => 
    book.tier === selectedTier && book.type === selectedType
  );
  
  const canLearnCheck = (book: BookConfig, discipleId: string): { canLearn: boolean; reason: string } => {
    const disciple = getDiscipleById(discipleId);
    if (!disciple) return { canLearn: false, reason: '弟子不存在' };
    
    if (disciple.learningBook) return { canLearn: false, reason: '正在学习其他书籍' };
    
    const tierRealmMap: Record<BookTier, number> = {
      foundation: RealmOrder.indexOf('foundation'),
      golden: RealmOrder.indexOf('golden'),
      nascent: RealmOrder.indexOf('nascent'),
      spirit: RealmOrder.indexOf('spirit'),
    };
    
    const discipleRealmIndex = RealmOrder.indexOf(disciple.realm);
    
    if (discipleRealmIndex < tierRealmMap[book.tier]) {
      return { canLearn: false, reason: `需要${RealmNames[RealmOrder[tierRealmMap[book.tier]]]}以上` };
    }
    
    // 灵根检查
    const spiritRoots = disciple.hiddenTalents.spiritRoots || [];
    if (!checkRootMatch(spiritRoots, book)) {
      const attrName = BookAttributeNames[book.attribute];
      return { canLearn: false, reason: `灵根不符（需${attrName}属性灵根或通用功法）` };
    }
    
    const cost = libraryCosts[book.tier];
    if (disciple.contributionPoints < cost) {
      return { canLearn: false, reason: `贡献点不足（需${cost}）` };
    }
    
    if (book.type === 'technique' && disciple.learnedTechnique) {
      return { canLearn: false, reason: '已学习功法（请先遗忘）' };
    }
    
    if (book.type === 'battle' && disciple.learnedBattles.length >= 2) {
      return { canLearn: false, reason: '已学习2本战技（请先遗忘）' };
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
  
  const isTierUnlocked = (tier: BookTier): boolean => {
    return allTiers.indexOf(tier) <= allTiers.indexOf(unlockedTier);
  };
  
  // 品质颜色
  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-purple-400';
    if (quality >= 60) return 'text-blue-400';
    if (quality >= 40) return 'text-green-400';
    return 'text-gray-400';
  };

  const getQualityText = (quality: number) => {
    if (quality >= 90) return '仙品';
    if (quality >= 80) return '极品';
    if (quality >= 60) return '上品';
    if (quality >= 40) return '中品';
    return '下品';
  };

  // 获取属性颜色
  const getAttributeColor = (attr: string) => {
    const colors: Record<string, string> = {
      gold: 'text-yellow-400',
      wood: 'text-green-400',
      water: 'text-blue-400',
      fire: 'text-red-400',
      earth: 'text-amber-600',
      thunder: 'text-purple-400',
      wind: 'text-cyan-400',
      ice: 'text-cyan-200',
      universal: 'text-sect-gold',
    };
    return colors[attr] || 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-sect-gold flex items-center gap-2">
            <BookOpen size={20} />
            藏经阁 · 共分四层
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={16} />
          </Button>
        </div>
        <p className="text-sm text-sect-jade/60 mt-1">
          藏经阁共分四层，对应筑基、金丹、元婴、化神级功法与战技
        </p>
      </div>
      
      {/* 设置面板 */}
      {showSettings && (
        <Card className="bg-sect-gold/5 border-sect-gold/30">
          <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
            <Settings size={16} />
            藏经阁设置
          </h3>
          <div className="space-y-3">
            {allTiers.map(tier => {
              if (!isTierUnlocked(tier)) return null;
              return (
                <div key={tier} className="flex items-center justify-between">
                  <span className="text-sm text-sect-jade/80">
                    {BookTierNames[tier]}层学习贡献
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLibraryCost(tier, Math.max(0, libraryCosts[tier] - 50))}
                    >
                      -
                    </Button>
                    <span className="w-16 text-center font-display text-sect-gold">
                      {libraryCosts[tier]}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLibraryCost(tier, libraryCosts[tier] + 50)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      
      {/* 购买书籍 */}
      <Card className="bg-purple-500/5 border-purple-500/30">
        <h3 className="font-display text-purple-300 mb-3 flex items-center gap-2">
          <ShoppingCart size={16} />
          购买随机书籍
          <span className="text-xs text-purple-400/60 ml-auto">
            灵石：{Math.floor(spiritStones)}
          </span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {allTiers.map(tier => {
            const unlocked = isTierUnlocked(tier);
            const price = getBookPrice(tier);
            const canBuy = unlocked && spiritStones >= price;
            return (
              <Tooltip key={tier} content={unlocked ? `消耗${price}灵石` : '藏经阁等级不足'}>
                <Button
                  variant={canBuy ? 'gold' : 'ghost'}
                  size="sm"
                  onClick={() => canBuy && handleBuyBook(tier)}
                  disabled={!canBuy}
                  className="w-full"
                >
                  <Gem size={14} className="mr-1" />
                  {BookTierNames[tier]}·{price}
                </Button>
              </Tooltip>
            );
          })}
        </div>
        {lastBoughtBook && (
          <div className="mt-3 p-3 bg-purple-500/20 rounded-lg border border-purple-500/40 animate-pulse">
            <div className="text-sm text-purple-200 flex items-center gap-2">
              <Sparkles size={14} />
              获得新书籍：
              <span className="font-display text-purple-100">{lastBoughtBook.name}</span>
              <Badge variant="spirit" size="sm">{BookTierNames[lastBoughtBook.tier]}</Badge>
              <Badge variant="pill" size="sm">{BookTypeNames[lastBoughtBook.type]}</Badge>
            </div>
          </div>
        )}
      </Card>
      
      {/* 层数选择 */}
      <div className="flex gap-2 flex-wrap">
        {allTiers.map((tier, index) => {
          const unlocked = isTierUnlocked(tier);
          const tierBookCount = libraryBooks.filter(b => b.tier === tier).length;
          return (
            <button
              key={tier}
              onClick={() => unlocked && setSelectedTier(tier)}
              className={cn(
                'px-4 py-2 rounded-lg border font-display text-sm transition-all',
                selectedTier === tier
                  ? 'bg-sect-gold/20 border-sect-gold text-sect-gold'
                  : unlocked
                    ? 'border-sect-gold/30 text-sect-jade/80 hover:border-sect-gold/50'
                    : 'border-gray-600 text-gray-500 cursor-not-allowed'
              )}
              disabled={!unlocked}
            >
              {unlocked ? (
                <span className="flex items-center gap-1">
                  <BookOpen size={14} />
                  {BookTierNames[tier]}层 ({tierBookCount})
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Lock size={14} />
                  {BookTierNames[tier]}层
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* 类型切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedType('technique')}
          className={cn(
            'flex-1 py-2 rounded-lg border font-display text-sm transition-all',
            selectedType === 'technique'
              ? 'bg-spirit-500/20 border-spirit-500 text-spirit-400'
              : 'border-sect-gold/30 text-sect-jade/80 hover:border-sect-gold/50'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <BookOpen size={16} />
            功法（修炼+战力）
          </span>
        </button>
        <button
          onClick={() => setSelectedType('battle')}
          className={cn(
            'flex-1 py-2 rounded-lg border font-display text-sm transition-all',
            selectedType === 'battle'
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'border-sect-gold/30 text-sect-jade/80 hover:border-sect-gold/50'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <Sword size={16} />
            战技（战力）
          </span>
        </button>
      </div>
      
      {/* 选择弟子 */}
      <div>
        <h3 className="text-sm text-sect-jade/80 mb-2 flex items-center gap-2">
          <User size={16} />
          选择学习的弟子
        </h3>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {assignedDisciples.length === 0 ? (
            <div className="text-sect-jade/40 text-sm">暂无弟子在藏经阁</div>
          ) : (
            assignedDisciples.map(disciple => (
              <button
                key={disciple.id}
                onClick={() => setSelectedDiscipleId(
                  selectedDiscipleId === disciple.id ? null : disciple.id
                )}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm transition-all flex items-center gap-2',
                  selectedDiscipleId === disciple.id
                    ? 'bg-sect-gold/20 border-sect-gold text-sect-gold'
                    : 'border-sect-gold/30 text-sect-jade/80 hover:border-sect-gold/50'
                )}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: `hsl(${(disciple.avatarSeed * 137.5) % 360}, 30%, 25%)`,
                    color: `hsl(${(disciple.avatarSeed * 137.5) % 360}, 60%, 70%)`,
                  }}
                >
                  {disciple.name.charAt(0)}
                </div>
                {disciple.name}
                {disciple.learningBook && (
                  <Badge variant="spirit" size="sm">学习中</Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* 已选弟子信息 */}
      {selectedDisciple && (
        <Card className="bg-sect-gold/5 border-sect-gold/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: `hsl(${(selectedDisciple.avatarSeed * 137.5) % 360}, 30%, 25%)`,
                  color: `hsl(${(selectedDisciple.avatarSeed * 137.5) % 360}, 60%, 70%)`,
                }}
              >
                {selectedDisciple.name.charAt(0)}
              </div>
              <div>
                <div className="font-display text-sect-gold">{selectedDisciple.name}</div>
                <div className="text-xs text-sect-jade/60">
                  {DiscipleStatusNames[selectedDisciple.status]} · {RealmNames[selectedDisciple.realm]}
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {selectedDisciple.hiddenTalents.spiritRoots.map((root, idx) => (
                    <span key={idx} className={cn(
                      'text-xs px-1 rounded',
                      getAttributeColor(root.type) + ' bg-sect-ink/50'
                    )}>
                      {SpiritRootNames[root.type as keyof typeof SpiritRootNames]}{root.quality}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-sect-jade/60">贡献点</div>
              <div className="font-display text-sect-gold">
                {Math.floor(selectedDisciple.contributionPoints)}
              </div>
            </div>
          </div>
          
          {/* 正在学习 */}
          {selectedDisciple.learningBook && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-300 flex items-center gap-2">
                  <Clock size={14} />
                  正在学习：{selectedDisciple.learningBook.name}
                </span>
                <span className="text-xs text-purple-400">
                  {BookTypeNames[selectedDisciple.learningBook.type]}
                </span>
              </div>
              <ProgressBar 
                value={selectedDisciple.learningBook.progress} 
                max={100} 
                color="spirit"
              />
              <div className="text-xs text-purple-400 mt-1 text-right">
                {Math.floor(selectedDisciple.learningBook.progress)}%
              </div>
            </div>
          )}
          
          {/* 已学功法 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sect-jade/80">
                已学功法（{selectedDisciple.learnedTechnique ? 1 : 0}/1）
              </span>
            </div>
            {selectedDisciple.learnedTechnique ? (
              <div className="bg-spirit-500/10 border border-spirit-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-spirit-400">
                      {selectedDisciple.learnedTechnique.name}
                    </span>
                    <div className="text-xs text-sect-jade/60 mt-1">
                      修炼+{selectedDisciple.learnedTechnique.cultivationBonus}% · 战力+{selectedDisciple.learnedTechnique.combatBonus}%
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleForget('technique', selectedDisciple.learnedTechnique!.bookId)}
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-sect-jade/40">尚未学习功法</div>
            )}
          </div>
          
          {/* 已学战技 */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sect-jade/80">
                已学战技（{selectedDisciple.learnedBattles.length}/2）
              </span>
            </div>
            {selectedDisciple.learnedBattles.length > 0 ? (
              <div className="space-y-2">
                {selectedDisciple.learnedBattles.map(battle => (
                  <div key={battle.bookId} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-display text-red-400">
                          {battle.name}
                        </span>
                        <div className="text-xs text-sect-jade/60 mt-1">
                          战力+{battle.combatBonus}%
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleForget('battle', battle.bookId)}
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-sect-jade/40">尚未学习战技</div>
            )}
          </div>
        </Card>
      )}
      
      {/* 书籍列表 */}
      <div>
        <h3 className="text-sm text-sect-jade/80 mb-3">
          {BookTierNames[selectedTier]}层{BookTypeNames[selectedType]}（{filteredBooks.length}本）
        </h3>
        {filteredBooks.length === 0 ? (
          <div className="text-center py-8 text-sect-jade/40">
            <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">此层暂无比类书籍</p>
            <p className="text-xs mt-1">购买随机书籍可获得更多书籍</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {filteredBooks.map(book => {
              const { canLearn, reason } = selectedDisciple
                ? canLearnCheck(book, selectedDisciple.id)
                : { canLearn: false, reason: '请先选择弟子' };

              // 获取弟子匹配的灵根
              const matchedRoots = selectedDisciple
                ? selectedDisciple.hiddenTalents.spiritRoots.filter(r => r.type === book.attribute)
                : [];

              // 功法卡片样式
              const getBookCardStyle = () => {
                if (book.tier === 'spirit') return 'from-purple-900/50 to-indigo-900/30 border-purple-500/40';
                if (book.tier === 'nascent') return 'from-blue-900/50 to-cyan-900/30 border-blue-500/40';
                if (book.tier === 'golden') return 'from-amber-900/50 to-yellow-900/30 border-amber-500/40';
                return 'from-emerald-900/50 to-teal-900/30 border-emerald-500/40';
              };

              return (
                <div key={book.id} className={cn(
                  'card-ancient relative overflow-hidden transition-all duration-300',
                  'hover:scale-[1.02] hover:shadow-lg',
                  book.attribute !== 'universal' && matchedRoots.length === 0 && 'opacity-70',
                  !canLearn && selectedDisciple && 'opacity-80'
                )}>
                  {/* 顶部装饰线 */}
                  <div className={cn(
                    'absolute top-0 left-0 right-0 h-1 opacity-60',
                    book.tier === 'spirit' ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500' :
                    book.tier === 'nascent' ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500' :
                    book.tier === 'golden' ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500' :
                    'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500'
                  )} />

                  <div className="p-4 pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* 功法图标 */}
                        <div className={cn(
                          'relative p-3 rounded-xl',
                          book.type === 'technique' ? 'bg-gradient-to-br from-violet-500/30 to-purple-500/20' : 'bg-gradient-to-br from-red-500/30 to-orange-500/20',
                          'border border-current/20'
                        )}>
                          {book.type === 'technique'
                            ? <BookOpen size={24} className="text-violet-400" />
                            : <Sword size={24} className="text-red-400" />
                          }
                          {/* 图标光晕 */}
                          <div className={cn(
                            'absolute inset-0 rounded-xl blur-md opacity-50',
                            book.type === 'technique' ? 'bg-violet-500/30' : 'bg-red-500/30'
                          )} />
                        </div>
                        <div>
                          <h4 className="font-display text-lg text-sect-jade">{book.name}</h4>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge
                              variant={book.type === 'technique' ? 'spirit' : 'pill'}
                              size="sm"
                              className="font-medium"
                            >
                              {BookTierNames[book.tier]}
                            </Badge>
                            <Badge
                              variant="gold"
                              size="sm"
                              className={cn(getAttributeColor(book.attribute), 'font-medium')}
                            >
                              {BookAttributeNames[book.attribute]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {/* 品质标签 */}
                      <div className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold',
                        book.quality >= 80 ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 border border-purple-500/40' :
                        book.quality >= 60 ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-300 border border-blue-500/40' :
                        'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border border-green-500/40'
                      )}>
                        {getQualityText(book.quality)}
                      </div>
                    </div>

                    <p className="text-sm text-sect-jade/70 mb-4 leading-relaxed">
                      {book.description}
                    </p>

                    {/* 灵根匹配指示 */}
                    {selectedDisciple && book.attribute !== 'universal' && (
                      <div className="mb-3 p-2 rounded-lg bg-sect-ink-dark/50">
                        {matchedRoots.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 text-sm">◈ 匹配灵根</span>
                            <div className="flex gap-1">
                              {matchedRoots.map((r, i) => (
                                <span key={i} className={cn('font-medium', getAttributeColor(r.type))}>
                                  {SpiritRootNames[r.type as keyof typeof SpiritRootNames]}{r.quality}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-red-400 text-sm flex items-center gap-2">
                            <span>✕</span>
                            <span>灵根不匹配（需{BookAttributeNames[book.attribute]}属性）</span>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedDisciple && book.attribute === 'universal' && (
                      <div className="mb-3 p-2 rounded-lg bg-sect-gold/10 text-sect-gold text-sm">
                        ☯ 通用功法：所有弟子皆可学习
                      </div>
                    )}

                    {/* 属性加成 */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {book.cultivationBonus > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10">
                          <span className="text-sect-jade/60 text-sm flex items-center gap-1">
                            <Sparkles size={14} /> 修炼加成
                          </span>
                          <span className="text-emerald-400 font-medium">+{book.cultivationBonus}%</span>
                        </div>
                      )}
                      {book.combatBonus > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                          <span className="text-sect-jade/60 text-sm flex items-center gap-1">
                            <Sword size={14} /> 战力加成
                          </span>
                          <span className="text-red-400 font-medium">+{book.combatBonus}%</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10">
                        <span className="text-sect-jade/60 text-sm flex items-center gap-1">
                          <Clock size={14} /> 学习时间
                        </span>
                        <span className="text-blue-400">{book.learnDays}月</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10">
                        <span className="text-sect-jade/60 text-sm flex items-center gap-1">
                          <Gem size={14} /> 贡献消耗
                        </span>
                        <span className="text-amber-400">{libraryCosts[book.tier]}点</span>
                      </div>
                    </div>

                    <Tooltip content={reason}>
                      <Button
                        variant={canLearn ? 'gold' : 'ghost'}
                        size="sm"
                        className="w-full"
                        onClick={() => handleLearn(book.id)}
                        disabled={!canLearn}
                      >
                        {canLearn ? '开始修炼' : reason}
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
