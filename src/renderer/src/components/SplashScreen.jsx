import React, { useState, useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import iconImage from '../assets/icon.png';

const SplashScreen = ({ onDismiss, delayBeforeDismiss = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoScale, setLogoScale] = useState(0.8);
  const [titleOpacity, setTitleOpacity] = useState(0);

  useEffect(() => {
    // Initial animations
    setTimeout(() => {
      setLogoScale(1);
      setTimeout(() => {
        setTitleOpacity(1);
      }, 300);
    }, 100);

    // Start fade out animation before dismissing
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, delayBeforeDismiss - 500); // Start fade out 500ms before dismissing

    // Dismiss after delay
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, delayBeforeDismiss);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(dismissTimer);
    };
  }, [delayBeforeDismiss, onDismiss]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-500"
      style={{
        background: `linear-gradient(to bottom, var(--color-primary-900), var(--color-primary-800))`,
        opacity: fadeOut ? 0 : 1
      }}
    >
      <div className="flex flex-col items-center">
        {/* App Icon */}
        <div 
          className="w-32 h-32 mb-8 relative"
          style={{ 
            transform: `scale(${logoScale})`,
            transition: 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1)'
          }}
        >
          <div className="absolute inset-0 bg-white/10 rounded-full blur-xl"></div>
          <img 
            src={iconImage} 
            alt="GAMVRA Icon" 
            className="w-full h-full object-contain relative z-10"
            onError={(e) => {
              console.error('Error loading icon image');
              e.target.style.display = 'none';
              document.getElementById('fallback-icon').style.display = 'flex';
            }}
          />
          <div 
            id="fallback-icon" 
            className="absolute inset-0 rounded-2xl items-center justify-center"
            style={{ 
              display: 'none',
              backgroundColor: 'var(--color-primary-700)' 
            }}
          >
            <HeartPulse className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <div style={{ 
          opacity: titleOpacity,
          transform: `translateY(${titleOpacity ? '0' : '10px'})`,
          transition: 'opacity 0.8s ease, transform 0.8s ease'
        }}>
          {/* App Title */}
          <h1 className="text-5xl font-bold text-white mb-2 tracking-wider text-center">GAMVRA</h1>
          
          {/* App Description */}
          <p className="text-xl mb-8 text-center" style={{ color: 'var(--color-primary-200)' }}>
            Gemma Agent for Medical VR Assistant
          </p>
          
          {/* Loading Indicator */}
          <div className="flex items-center justify-center space-x-2 mt-2">
            <div className="w-2.5 h-2.5 rounded-full animate-bounce" 
                 style={{ backgroundColor: 'var(--color-primary-300)', animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full animate-bounce" 
                 style={{ backgroundColor: 'var(--color-primary-300)', animationDelay: '200ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full animate-bounce" 
                 style={{ backgroundColor: 'var(--color-primary-300)', animationDelay: '400ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
