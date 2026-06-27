'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

// ============================================================
// TYPES
// ============================================================

export interface BranchInfo {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn?: string;
  addressAr?: string;
  phone?: string;
  mapUrl?: string;
  openingHours?: Record<string, string>;
  status: 'OPEN' | 'CLOSED';
  isActive: boolean;
}

interface BranchContextType {
  // All branches loaded from DB
  allBranches: BranchInfo[];
  // Branches the current user is allowed to access (empty = global access)
  userBranches: BranchInfo[];
  // The currently selected branch
  selectedBranch: BranchInfo | null;
  selectedBranchId: string | null;
  // Whether the current user/view is showing ALL branches (global view)
  isGlobalView: boolean;
  // Whether the current role has global access (OWNER/DEV/HEAD_ADMIN)
  hasGlobalAccess: boolean;
  isLoading: boolean;
  // Actions
  selectBranch: (branchId: string | null, alwaysRemember?: boolean) => void;
  clearBranch: () => void;
  refetchBranches: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const GLOBAL_ACCESS_ROLES = ['OWNER', 'DEVELOPER', 'HEAD_ADMIN'];
const BRANCH_STORAGE_KEY = 'dodz_selected_branch_id';
const CUSTOMER_BRANCH_KEY = 'dodz_customer_branch_id';

function mapBranchRow(row: any): BranchInfo {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    addressEn: row.address_en || '',
    addressAr: row.address_ar || '',
    phone: row.phone || '',
    mapUrl: row.map_url || '',
    openingHours: row.opening_hours || {},
    status: row.status || 'OPEN',
    isActive: row.is_active,
  };
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [allBranches, setAllBranches] = useState<BranchInfo[]>([]);
  const [userBranches, setUserBranches] = useState<BranchInfo[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasGlobalAccess = role ? GLOBAL_ACCESS_ROLES.includes(role) : false;

  // -------------------------------------------------------
  // Load all branches
  // -------------------------------------------------------
  const fetchAllBranches = useCallback(async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('created_at');
    if (!error && data) {
      setAllBranches(data.map(mapBranchRow));
    }
  }, []);

  // -------------------------------------------------------
  // Load branches assigned to the current user
  // -------------------------------------------------------
  const fetchUserBranches = useCallback(async () => {
    if (!isAuthenticated) {
      setUserBranches([]);
      return;
    }

    if (hasGlobalAccess) {
      setUserBranches([]); // empty = unlimited access
      return;
    }

    const { data, error } = await supabase
      .from('user_branch_assignments')
      .select('branch_id, branches(*)')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');

    if (!error && data) {
      const branches = data
        .filter((r: any) => r.branches)
        .map((r: any) => mapBranchRow(r.branches));
      setUserBranches(branches);
    }
  }, [isAuthenticated, hasGlobalAccess]);

  const refetchBranches = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAllBranches(), fetchUserBranches()]);
    setIsLoading(false);
  }, [fetchAllBranches, fetchUserBranches]);

  // -------------------------------------------------------
  // On auth change, reload branches
  // -------------------------------------------------------
  useEffect(() => {
    if (!authLoading) {
      refetchBranches();
    }
  }, [authLoading, isAuthenticated, role]);

  // -------------------------------------------------------
  // Restore selected branch from localStorage
  // -------------------------------------------------------
  useEffect(() => {
    const restoreBranch = async () => {
      if (typeof window !== 'undefined') {
        if (isAuthenticated) {
          try {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data.user?.id;
            if (userId) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('branch_id, role')
                .eq('id', userId)
                .single();

              if (prof && prof.branch_id && prof.role === 'CUSTOMER') {
                setSelectedBranchId(prof.branch_id);
                localStorage.setItem(BRANCH_STORAGE_KEY, prof.branch_id);
                localStorage.setItem(CUSTOMER_BRANCH_KEY, prof.branch_id);
                localStorage.setItem('dodz_branch_remember_always', 'true');
                localStorage.removeItem('dodz_branch_expire_time');
                return;
              }
            }
          } catch (e) {
            console.error('Failed to restore branch from profile:', e);
          }
        }

        const storageKey = isAuthenticated ? BRANCH_STORAGE_KEY : CUSTOMER_BRANCH_KEY;
        const saved = localStorage.getItem(storageKey);
        const rememberAlways = localStorage.getItem('dodz_branch_remember_always') === 'true';
        const expireTimeStr = localStorage.getItem('dodz_branch_expire_time');
        const expireTime = expireTimeStr ? Number(expireTimeStr) : null;

        if (saved) {
          if (rememberAlways || !expireTime || Date.now() < expireTime) {
            setSelectedBranchId(saved);
          } else {
            // Selection expired after 24 hours
            localStorage.removeItem(storageKey);
            localStorage.removeItem(CUSTOMER_BRANCH_KEY);
            localStorage.removeItem('dodz_branch_remember_always');
            localStorage.removeItem('dodz_branch_expire_time');
            setSelectedBranchId(null);
          }
        }
      }
    };
    restoreBranch();
  }, [isAuthenticated, supabase]);

  // -------------------------------------------------------
  // Auto-select if user only has one branch
  // -------------------------------------------------------
  useEffect(() => {
    if (!hasGlobalAccess && userBranches.length === 1 && !selectedBranchId) {
      selectBranch(userBranches[0].id);
    }
  }, [userBranches, hasGlobalAccess, selectedBranchId]);

  // -------------------------------------------------------
  // Actions
  // -------------------------------------------------------
  const selectBranch = useCallback(async (branchId: string | null, alwaysRemember: boolean = false) => {
    setSelectedBranchId(branchId);
    if (typeof window !== 'undefined') {
      const storageKey = BRANCH_STORAGE_KEY;
      if (branchId) {
        localStorage.setItem(storageKey, branchId);
        localStorage.setItem(CUSTOMER_BRANCH_KEY, branchId);
        localStorage.setItem('dodz_branch_remember_always', alwaysRemember ? 'true' : 'false');
        if (!alwaysRemember) {
          const expireTime = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem('dodz_branch_expire_time', String(expireTime));
        } else {
          localStorage.removeItem('dodz_branch_expire_time');
        }

        // Save selection to profiles in database if user is authenticated customer and chose alwaysRemember
        if (isAuthenticated && alwaysRemember) {
          try {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data.user?.id;
            if (userId) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();
              
              if (prof && prof.role === 'CUSTOMER') {
                await supabase
                  .from('profiles')
                  .update({ branch_id: branchId })
                  .eq('id', userId);
              }
            }
          } catch (e) {
            console.error('Failed to save selected branch to profile:', e);
          }
        }
      } else {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(CUSTOMER_BRANCH_KEY);
        localStorage.removeItem('dodz_branch_remember_always');
        localStorage.removeItem('dodz_branch_expire_time');
      }
    }
  }, [isAuthenticated, supabase]);

  const clearBranch = useCallback(() => {
    selectBranch(null);
  }, [selectBranch]);

  // -------------------------------------------------------
  // Derived state
  // -------------------------------------------------------
  const selectedBranch = allBranches.find((b) => b.id === selectedBranchId) || null;
  // "Global view" = has global access AND no specific branch selected
  const isGlobalView = hasGlobalAccess && !selectedBranchId;

  return (
    <BranchContext.Provider
      value={{
        allBranches,
        userBranches,
        selectedBranch,
        selectedBranchId,
        isGlobalView,
        hasGlobalAccess,
        isLoading,
        selectBranch,
        clearBranch,
        refetchBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextType {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
