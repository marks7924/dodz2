'use client';

import React, { useEffect, useState } from 'react';

export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Keep loader visible for 2 seconds, then trigger fade out
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#09090b] flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Animated splitting logo container */}
        <div className="absolute w-40 h-40 flex items-center justify-center">
          
          {/* Left half of the logo */}
          <div 
            className="absolute inset-0 bg-contain bg-center bg-no-repeat animate-merge-left"
            style={{
              backgroundImage: 'url(/logo.png)',
              clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
            }}
          />

          {/* Right half of the logo */}
          <div 
            className="absolute inset-0 bg-contain bg-center bg-no-repeat animate-merge-right"
            style={{
              backgroundImage: 'url(/logo.png)',
              clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)',
            }}
          />

          {/* Core glow that flares up when they merge */}
          <div className="absolute w-28 h-28 bg-primary-red rounded-full opacity-0 filter blur-xl animate-flare" />
        </div>

        {/* Brand Text Loading Indicator */}
        <div className="absolute bottom-4 flex flex-col items-center gap-1.5 animate-fade-in-delayed">
          <span className="text-xl font-black tracking-widest text-white uppercase bg-gradient-to-r from-primary-red to-accent-amber bg-clip-text text-transparent">
            DODZ
          </span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary-red rounded-full animate-bounce duration-300" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-accent-amber rounded-full animate-bounce duration-300" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce duration-300" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes merge-left {
          0% {
            transform: translateX(-150px) scale(0.7);
            opacity: 0;
          }
          40% {
            transform: translateX(-150px) scale(1);
            opacity: 1;
          }
          75% {
            transform: translateX(0) scale(1);
          }
          100% {
            transform: translateX(0) scale(1);
          }
        }

        @keyframes merge-right {
          0% {
            transform: translateX(150px) scale(0.7);
            opacity: 0;
          }
          40% {
            transform: translateX(150px) scale(1);
            opacity: 1;
          }
          75% {
            transform: translateX(0) scale(1);
          }
          100% {
            transform: translateX(0) scale(1);
          }
        }

        @keyframes flare {
          0%, 65% {
            opacity: 0;
            transform: scale(0.5);
          }
          75% {
            opacity: 0.6;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }

        @keyframes fade-in-delayed {
          0%, 60% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-merge-left {
          animation: merge-left 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-merge-right {
          animation: merge-right 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-flare {
          animation: flare 1.8s ease-out forwards;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 1.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
