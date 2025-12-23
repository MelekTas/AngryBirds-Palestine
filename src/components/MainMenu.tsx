import React, { useState } from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  isMusicOn: boolean;
  onToggleMusic: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, isMusicOn, onToggleMusic }) => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      backgroundImage: "url('/image/backgraound/bg_palestine.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      margin: 0, padding: 0
    }}>
      {/* Karartma overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1
      }} />

      {/* Ana İçerik */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        animation: 'fadeIn 1s ease-in',
        padding: '20px',
        maxWidth: '90vw'
      }}>
        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 72px)',
          fontWeight: '900',
          color: '#fff',
          textShadow: '4px 4px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.5)',
          marginBottom: '10px',
          fontFamily: 'Impact, Arial Black, sans-serif',
          letterSpacing: '3px',
          lineHeight: 1.2
        }}>
          ANGRY BIRDS
        </h1>

        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: 'bold',
          color: '#FFD700',
          textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
          marginBottom: 'clamp(30px, 5vh, 50px)',
          fontFamily: 'Arial, sans-serif',
          lineHeight: 1.2
        }}>
          🇵🇸 FİLİSTİN 🇵🇸
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(12px, 2vh, 20px)',
          alignItems: 'center',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <button
            onClick={onStartGame}
            style={menuButtonStyle('linear-gradient(135deg, #4CAF50 0%, #45a049 100%)')}
          >
            🎮 OYNA
          </button>

          <button
            onClick={onToggleMusic}
            style={menuButtonStyle(isMusicOn ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' : 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)')}
          >
            {isMusicOn ? '🔊 MÜZİK AÇIK' : '🔇 MÜZİK KAPALI'}
          </button>

          <button
            onClick={() => setShowAbout(true)}
            style={menuButtonStyle('linear-gradient(135deg, #FF9800 0%, #F57C00 100%)')}
          >
            ℹ️ HAKKINDA
          </button>
        </div>

        <p style={{
          marginTop: 'clamp(30px, 5vh, 60px)',
          fontSize: 'clamp(14px, 2vw, 18px)',
          color: '#fff',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          fontFamily: 'Arial, sans-serif',
          opacity: 0.9,
          padding: '0 20px'
        }}>
          🕊️ Özgürlük için savaşın başlasın! 🕊️
        </p>
      </div>

      {/* --- HAKKINDA POP-UP (MODAL) --- */}
      {showAbout && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 100,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '25px',
            maxWidth: '450px',
            width: '85%',
            textAlign: 'center',
            border: '5px solid #FF9800',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <h2 style={{ color: '#FF9800', fontSize: '32px', marginBottom: '20px' }}>HAKKINDA</h2>
            <div style={{ fontSize: '18px', color: '#333', lineHeight: '1.6', textAlign: 'left' }}>
              <p><strong>Versiyon:</strong> v1.0</p>
              <p><strong>Konu:</strong> Kuşları fırlat, adaleti sağla ve Filistin'i özgürlüğüne kavuştur!</p>
              <p><strong>Yapımcılar:</strong> <br/> ✨ Melek, Fatma, Sude</p>
              <p style={{ fontStyle: 'italic', marginTop: '15px', color: '#666' }}>"Özgürlük için savaş!" 🇵🇸</p>
            </div>
            <button 
              onClick={() => setShowAbout(false)}
              style={{
                marginTop: '30px',
                padding: '12px 30px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              KAPAT
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// Ortak buton stili fonksiyonu
const menuButtonStyle = (background: string) => ({
  width: '100%',
  maxWidth: '400px',
  padding: 'clamp(15px, 2vh, 20px) clamp(40px, 5vw, 60px)',
  fontSize: 'clamp(20px, 2.5vw, 28px)',
  fontWeight: 'bold',
  background: background,
  color: 'white',
  border: 'none',
  borderRadius: '15px',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
  transition: 'all 0.3s ease',
  fontFamily: 'Arial, sans-serif',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px'
});

export default MainMenu;