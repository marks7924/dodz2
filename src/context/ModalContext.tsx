'use client';

import React, { createContext, useContext, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface ModalOptions {
  title?: string;
  message: string;
  placeholder?: string;
  isPrompt?: boolean;
  isAlert?: boolean;
}

interface ModalContextType {
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, placeholder?: string, title?: string) => Promise<string | null>;
  alert: (message: string, title?: string) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModalOptions | null>(null);
  const [promptValue, setPromptValue] = useState('');
  
  const resolverRef = useRef<((value: any) => void) | null>(null);

  const confirm = (message: string, title?: string): Promise<boolean> => {
    const defaultTitle = locale === 'en' ? 'Confirm Action' : 'تأكيد الإجراء';
    setOptions({ message, title: title || defaultTitle, isPrompt: false, isAlert: false });
    setPromptValue('');
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const prompt = (message: string, placeholder = '', title?: string): Promise<string | null> => {
    const defaultTitle = locale === 'en' ? 'Input Required' : 'مطلوب إدخال بيانات';
    setOptions({ message, placeholder, title: title || defaultTitle, isPrompt: true, isAlert: false });
    setPromptValue('');
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const alert = (message: string, title?: string): Promise<void> => {
    const defaultTitle = locale === 'en' ? 'Notification' : 'تنبيه';
    setOptions({ message, title: title || defaultTitle, isPrompt: false, isAlert: true });
    setPromptValue('');
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      if (options?.isPrompt) {
        resolverRef.current(promptValue);
      } else {
        resolverRef.current(true);
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(options?.isPrompt ? null : false);
    }
  };

  return (
    <ModalContext.Provider value={{ confirm, prompt, alert }}>
      {children}

      {isOpen && options && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#1C1917] border border-card-border rounded-3xl p-6 max-w-sm w-full space-y-6 animate-in fade-in zoom-in duration-200 shadow-2xl">
            <div className="text-center space-y-2">
              <span className="text-3xl block mb-1">⚠️</span>
              <h3 className="text-base font-black text-white">{options.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{options.message}</p>
            </div>

            {options.isPrompt && (
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={options.placeholder}
                className="w-full text-xs bg-card border border-card-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary-red/50 transition-colors"
                autoFocus
              />
            )}

            {options.isAlert ? (
              <div className="flex justify-center">
                <button
                  onClick={handleConfirm}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/10 text-center"
                >
                  {locale === 'en' ? 'OK' : 'موافق'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 bg-card border border-card-border hover:bg-white/5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {locale === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/10"
                >
                  {locale === 'en' ? 'Confirm' : 'تأكيد'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
}
