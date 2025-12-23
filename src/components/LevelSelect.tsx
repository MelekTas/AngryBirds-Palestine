import React from 'react';

interface LevelSelectProps {
  unlockedLevels: number[];
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

const LevelSelect: React.FC<LevelSelectProps> = ({ unlockedLevels, onSelectLevel, onBack }) => {
  const levels = [
    { id: 1, name: 'Birinci Katliam', difficulty: 'Kolay', color: '#4CAF50' },
    { id: 2, name: 'İkinci Katliam', difficulty: 'Orta', color: '#FF9800' },
    { id: 3, name: 'Son Savaş', difficulty: 'Zor', color: '#f44336' }
  ];

  const isUnlocked = (levelId: number) => unlockedLevels.includes(levelId);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundImage: "url('/image/backgraound/bg_palestine.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 1
      }} />

      {/* Geri Butonu */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 'clamp(15px, 3vh, 30px)',
          left: 'clamp(15px, 3vw, 30px)',
          padding: 'clamp(10px, 1.5vh, 15px) clamp(20px, 3vw, 30px)',
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontWeight: 'bold',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: '2px solid white',
          borderRadius: '10px',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        ← GERİ
      </button>

      {/* Ana İçerik */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        padding: '20px',
        maxWidth: '95vw',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: '900',
          color: '#fff',
          textShadow: '4px 4px 8px rgba(0,0,0,0.8)',
          marginBottom: 'clamp(30px, 5vh, 50px)',
          fontFamily: 'Impact, Arial, sans-serif',
          lineHeight: 1.2
        }}>
          SEVİYE SEÇ
        </h1>

        {/* Seviye Kartları */}
        <div style={{
          display: 'flex',
          gap: 'clamp(20px, 3vw, 40px)',
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {levels.map((level) => {
            const unlocked = isUnlocked(level.id);
            
            return (
              <div
                key={level.id}
                onClick={() => unlocked && onSelectLevel(level.id)}
                style={{
                  width: 'clamp(200px, 25vw, 280px)',
                  height: 'clamp(250px, 35vw, 350px)',
                  maxHeight: '400px',
                  background: unlocked 
                    ? `linear-gradient(135deg, ${level.color} 0%, ${level.color}dd 100%)`
                    : 'linear-gradient(135deg, #666 0%, #444 100%)',
                  borderRadius: 'clamp(15px, 2vw, 20px)',
                  padding: 'clamp(20px, 3vw, 30px)',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  boxShadow: unlocked 
                    ? '0 10px 30px rgba(0,0,0,0.5)'
                    : '0 5px 15px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: unlocked ? '4px solid white' : '4px solid #888',
                  position: 'relative',
                  opacity: unlocked ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (unlocked) {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-10px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = unlocked 
                    ? '0 10px 30px rgba(0,0,0,0.5)'
                    : '0 5px 15px rgba(0,0,0,0.3)';
                }}
              >
                {/* Kilit İkonu */}
                {!unlocked && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 'clamp(50px, 8vw, 80px)',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                  }}>
                    🔒
                  </div>
                )}

                {/* Seviye Numarası */}
                <div style={{
                  fontSize: 'clamp(48px, 8vw, 72px)',
                  fontWeight: 'bold',
                  color: 'white',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.6)',
                  fontFamily: 'Impact, Arial, sans-serif',
                  lineHeight: 1
                }}>
                  {level.id}
                </div>

                {/* Seviye Adı */}
                <div style={{
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  fontWeight: 'bold',
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.6)',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  {level.name}
                </div>

                {/* Zorluk */}
                <div style={{
                  fontSize: 'clamp(14px, 2vw, 18px)',
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: 'Arial, sans-serif',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  padding: 'clamp(6px, 1vh, 8px) clamp(15px, 2vw, 20px)',
                  borderRadius: '20px',
                  whiteSpace: 'nowrap'
                }}>
                  {unlocked ? level.difficulty : '🔒 KİTLİ'}
                </div>

                {/* Oyna Butonu */}
                {unlocked && (
                  <div style={{
                    fontSize: 'clamp(16px, 2vw, 20px)',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: 'clamp(8px, 1.5vh, 12px) clamp(20px, 3vw, 30px)',
                    borderRadius: '10px',
                    border: '2px solid white'
                  }}>
                    ▶ OYNA
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Alt Bilgi */}
        <p style={{
          marginTop: 'clamp(30px, 5vh, 50px)',
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: '#FFD700',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          padding: '0 20px'
        }}>
          🎯 Seviyeleri tamamlayarak yeni bölümleri aç!
        </p>
      </div>

      {/* CSS Animasyonu */}
      <style>{`
        /* Mobil için optimizasyon */
        @media (max-width: 768px) {
          body {
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
};

export default LevelSelect;