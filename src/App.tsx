import React, { useState, useEffect, useRef } from 'react';
import MainMenu from './components/MainMenu';
import LevelSelect from './components/LevelSelect';
import Level1 from './components/Level1';
import Level2 from './components/Level2';
import Level3 from './components/Level3';
import GameCompleteScreen from './components/GameCompleteScreen';
import './App.css';

type Screen =
  | 'menu'
  | 'levelSelect'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'gameComplete';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);

  // 🔊 MÜZİK REF
  const audioRef = useRef<HTMLAudioElement>(null);

  // 📦 Progress yükle
  useEffect(() => {
    const saved = localStorage.getItem('angrybirds_progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setUnlockedLevels(data.unlockedLevels || [1]);
      } catch (e) {
        console.error('Progress yükleme hatası:', e);
      }
    }
  }, []);

  // 🔊 MÜZİK AÇ / KAPA
  useEffect(() => {
    if (!audioRef.current) return;

    if (isMusicOn) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isMusicOn]);

  // 🖱️ Autoplay izni
  const handleUserInteraction = () => {
    if (audioRef.current && isMusicOn && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  // 💾 Progress kaydet
  const saveProgress = (levels: number[]) => {
    setUnlockedLevels(levels);
    localStorage.setItem(
      'angrybirds_progress',
      JSON.stringify({ unlockedLevels: levels })
    );
  };

  // 🔄 Oyunu sıfırla
  const resetGameProgress = () => {
    const resetData = [1];
    saveProgress(resetData);
    setCurrentScreen('levelSelect');
  };

  const handleLevelComplete = (levelNumber: number) => {
    if (levelNumber === 3) {
      setCurrentScreen('gameComplete');
      return;
    }

    const nextLevel = levelNumber + 1;
    if (!unlockedLevels.includes(nextLevel)) {
      saveProgress([...unlockedLevels, nextLevel]);
    }

    setCurrentScreen('levelSelect');
  };

  // 🧭 Navigasyon
  const goToMenu = () => setCurrentScreen('menu');
  const goToLevelSelect = () => setCurrentScreen('levelSelect');

  // 🔒 KİLİT KONTROLLÜ LEVEL BAŞLATMA
  const startLevel = (level: number) => {
    if (!unlockedLevels.includes(level)) return;

    if (level === 1) setCurrentScreen('level1');
    else if (level === 2) setCurrentScreen('level2');
    else if (level === 3) setCurrentScreen('level3');
  };

  return (
    <div
      className="App"
      onClick={handleUserInteraction}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    >
      {/* 🎵 ARKA PLAN MÜZİĞİ */}
      <audio ref={audioRef} src="/audio/gamemusic2.mp3" loop hidden />

      {/* ANA MENÜ */}
      {currentScreen === 'menu' && (
        <MainMenu
          onStartGame={goToLevelSelect}
          isMusicOn={isMusicOn}
          onToggleMusic={() => setIsMusicOn(!isMusicOn)}
        />
      )}

      {/* LEVEL SEÇİM */}
      {currentScreen === 'levelSelect' && (
        <LevelSelect
          unlockedLevels={unlockedLevels}
          onSelectLevel={startLevel}
          onBack={goToMenu}
        />
      )}

      {/* LEVEL 1 */}
      {currentScreen === 'level1' && (
        <Level1
          onComplete={() => handleLevelComplete(1)}
          onBackToMenu={goToMenu}
          onBackToLevelSelect={goToLevelSelect}
        />
      )}

      {/* LEVEL 2 */}
      {currentScreen === 'level2' && (
        <Level2
          onComplete={() => handleLevelComplete(2)}
          onBackToMenu={goToMenu}
          onBackToLevelSelect={goToLevelSelect}
        />
      )}

      {/* LEVEL 3 */}
      {currentScreen === 'level3' && (
        <Level3
          onComplete={() => handleLevelComplete(3)}
          onBackToMenu={goToMenu}
          onBackToLevelSelect={goToLevelSelect}
        />
      )}

      {/* 🎉 OYUN BİTTİ */}
      {currentScreen === 'gameComplete' && (
        <GameCompleteScreen
          onRestart={resetGameProgress}
          onBackToMenu={goToMenu}
        />
      )}
    </div>
  );
}

export default App;
