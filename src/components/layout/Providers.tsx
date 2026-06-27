'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { BranchProvider } from '@/context/BranchContext';
import { ModalProvider } from '@/context/ModalContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BranchProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </BranchProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
