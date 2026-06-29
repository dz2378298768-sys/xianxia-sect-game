import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Sparkles, Play, PlusCircle, LogOut, Mountain, 
  BookOpen, Users, Gem, Clock, AlertTriangle
} from 'lucide-react';

interface MainMenuProps {
  onStartNew: () => void;
  onContinue: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartNew, onContinue }) => {
  const { year, month, disciples, sectLevel, buildings, spiritStones, reputation } = useGameStore();
  const [hasSave, setHasSave] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('sect-game-save');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setHasSave(!!data.state && data.state.gameStarted);
      } catch {
        setHasSave(false);
      }
    }
  }, []);
  
  const handleNewGame = () => {
    if (hasSave) {
      setShowConfirmNew(true);
    } else {
      onStartNew();
    }
  };
  
  const confirmNewGame = () => {
    setShowConfirmNew(false);
    onStartNew();
  };
  
  const SectLevelNames: Record<string, string> = {
    founding: '草创期',
    known: '小有名气',
    famous: '声名鹊起',
    dominant: '一方霸主',
    eternal: '万古长青',
  };
  
  const activeBuildings = buildings.filter(b => b.status === 'active').length;
  
  return (
    <div className="h-full w-full paper-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-sect-gold/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-sect-spirit/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-sect-herb/5 blur-3xl" />
      </div>
      
      <div className="relative z-10 text-center max-w-2xl px-8">
        <div className="mb-10">
          <div className="mb-6 animate-float">
            <Mountain className="mx-auto text-sect-gold" size={72} strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-5xl text-gold-gradient mb-3 tracking-wider">
            宗 门 录
          </h1>
          <p className="text-sect-jade/60 font-display text-lg">
            修仙界·宗门管理模拟器
          </p>
        </div>
        
        <div className="space-y-4 mb-10">
          <Button 
            size="lg" 
            className="w-64 text-lg py-6"
            onClick={onContinue}
            disabled={!hasSave}
          >
            <Play size={22} className="mr-2" />
            继续游戏
          </Button>
          
          <div className="block">
            <Button 
              variant="outline"
              size="lg" 
              className="w-64 text-lg py-6"
              onClick={handleNewGame}
            >
              <PlusCircle size={22} className="mr-2" />
              新游戏
            </Button>
          </div>
          
          <Button 
            variant="ghost"
            size="lg" 
            className="w-64 text-lg py-6 opacity-70 hover:opacity-100"
            onClick={() => {
              if (confirm('确定要退出游戏吗？')) {
                window.close();
              }
            }}
          >
            <LogOut size={22} className="mr-2" />
            退出游戏
          </Button>
        </div>
        
        {hasSave && (
          <Card className="max-w-md mx-auto bg-sect-ink/30 border-sect-gold/20">
            <div className="text-left">
              <div className="text-sect-gold font-display text-lg mb-3 flex items-center gap-2">
                <BookOpen size={18} />
                上次存档
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-sect-jade/40" />
                  <span className="text-sect-jade/70">
                    第 {year} 年 {month} 月
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mountain size={14} className="text-sect-jade/40" />
                  <span className="text-sect-jade/70">
                    {SectLevelNames[sectLevel] || '未知'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-sect-jade/40" />
                  <span className="text-sect-jade/70">
                    {disciples.length} 名弟子
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-sect-jade/40" />
                  <span className="text-sect-jade/70">
                    {activeBuildings} 座建筑
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gem size={14} className="text-sect-jade/40" />
                  <span className="text-sect-jade/70">
                    {Math.floor(spiritStones)} 灵石
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-sect-jade/40" />
                  <span className="text-sect-jade/70">
                    {Math.floor(reputation)} 声望
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        <p className="text-sect-jade/30 text-sm mt-10 font-display">
          天道酬勤，道法自然
        </p>
      </div>
      
      {showConfirmNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sect-gold/20 flex items-center justify-center">
                <AlertTriangle size={32} className="text-sect-gold" />
              </div>
              <h3 className="font-display text-xl text-sect-gold mb-2">
                确认开新档？
              </h3>
              <p className="text-sect-jade/70 text-sm mb-6">
                开始新游戏将覆盖当前存档，
                <br />
                所有进度将无法恢复。
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1"
                  onClick={() => setShowConfirmNew(false)}
                >
                  取消
                </Button>
                <Button 
                  variant="gold" 
                  className="flex-1"
                  onClick={confirmNewGame}
                >
                  确认开新
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

function Building2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function Star(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
