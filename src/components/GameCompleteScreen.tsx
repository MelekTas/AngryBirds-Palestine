import React from 'react';

interface GameCompleteProps {
  onRestart: () => void;
  onBackToMenu: () => void;
}

const GameCompleteScreen: React.FC<GameCompleteProps> = ({ onRestart, onBackToMenu }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundImage: "url('/image/backgraound/bg_palestine.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.6)',
      }} />

      <div style={{
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        padding: '40px',
        borderRadius: '30px',
        textAlign: 'center',
        boxShadow: '0 0 50px rgba(0,0,0,0.6)',
        border: '10px solid #2E7D32',
        maxWidth: '90%',
        width: '450px',
        animation: 'zoomIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{ fontSize: '70px', marginBottom: '10px' }}>🇵🇸</div>
        <h1 style={{ 
          fontSize: '38px', color: '#1B5E20', 
          margin: '0 0 10px 0', fontFamily: 'Arial Black, sans-serif'
        }}>ZAFER SENİN!</h1>
        
        <p style={{ 
          fontSize: '20px', color: '#333', lineHeight: '1.4', 
          marginBottom: '30px', fontWeight: 'bold' 
        }}>
          Mescid-i Aksa'nın muhafızı oldun. <br/> 
          Tüm bölgeleri temizledin!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={onBackToMenu} style={btnStyle('#2E7D32')}>🏠 ANA MENÜYE DÖN</button>
          {/* GÜNCELLENDİ: window.location yerine onRestart çağrılıyor */}
          <button onClick={onRestart} style={btnStyle('#546E7A')}>🔄 OYUNU SIFIRLA</button>
        </div>
      </div>

      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const btnStyle = (bg: string) => ({
  padding: '16px', fontSize: '18px', fontWeight: '900',
  color: 'white', backgroundColor: bg, border: 'none',
  borderRadius: '15px', cursor: 'pointer',
  boxShadow: '0 4px 0 rgba(0,0,0,0.2)', transition: 'transform 0.1s'
} as React.CSSProperties);

export default GameCompleteScreen;