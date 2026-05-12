import { useEffect, useState } from 'react';

export function OrientationWarning() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Only execute in browser
    if (typeof window === 'undefined') return;
    
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check(); // Initial check
    
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#0D0500',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '24px', padding: '32px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: '72px',
        animation: 'spin 2s linear infinite',
      }}>↻</div>
      <p style={{
        fontFamily: "'Press Start 2P', cursive, sans-serif",
        fontSize: '12px', color: '#D4A843',
        lineHeight: '2',
      }}>
        Gire o dispositivo
      </p>
      <p style={{
        fontFamily: "'Teko', sans-serif",
        fontSize: '20px', color: '#F5E6C8',
      }}>
        O jogo funciona em modo paisagem 🌵
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
