'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import { X, Megaphone, Pencil, Check, Trash2 } from 'lucide-react';

const BANNER_KEY = 'promo_banner_text';
const BANNER_ACTIVE_KEY = 'promo_banner_active';

export default function PromoBanner() {
  const { role } = useAuth();
  const { selectedBranchId, selectedBranch } = useBranch();
  const supabase = createClient();

  const [bannerText, setBannerText] = useState<string | null>(null);
  const [bannerActive, setBannerActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = role && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('restaurant_settings')
          .select('key, value, branch_id')
          .in('key', [BANNER_KEY, BANNER_ACTIVE_KEY]);

        // Helper to get branch-specific setting or fallback to global (null branch_id)
        const getSetting = (keyName: string) => {
          const rows = data?.filter((r: any) => r.key === keyName) || [];
          const branchRow = selectedBranchId ? rows.find((r: any) => r.branch_id === selectedBranchId) : null;
          const globalRow = rows.find((r: any) => r.branch_id === null);
          return branchRow || globalRow || null;
        };

        const textRow = getSetting(BANNER_KEY);
        const activeRow = getSetting(BANNER_ACTIVE_KEY);

        setBannerText(textRow?.value || null);
        setBannerActive(activeRow?.value === 'true');
      } catch {
        // silent fallback — no banner shown
      } finally {
        setLoading(false);
      }
    };
    fetchBanner();
  }, [selectedBranchId]);

  const saveBanner = async (text: string, active: boolean) => {
    setSaving(true);
    try {
      const targetBranchId = selectedBranchId || null;

      // Delete existing settings for the current branch state to avoid partial unique index issues
      if (targetBranchId) {
        await supabase
          .from('restaurant_settings')
          .delete()
          .in('key', [BANNER_KEY, BANNER_ACTIVE_KEY])
          .eq('branch_id', targetBranchId);
      } else {
        await supabase
          .from('restaurant_settings')
          .delete()
          .in('key', [BANNER_KEY, BANNER_ACTIVE_KEY])
          .is('branch_id', null);
      }

      // Insert new settings for current branch state
      const { error } = await supabase.from('restaurant_settings').insert([
        { key: BANNER_KEY, value: text, branch_id: targetBranchId, description: 'Promotional banner text' },
        { key: BANNER_ACTIVE_KEY, value: active ? 'true' : 'false', branch_id: targetBranchId, description: 'Whether promo banner is visible' },
      ]);

      if (error) throw error;

      setBannerText(text);
      setBannerActive(active);
      setIsEditing(false);
      setDismissed(false);
    } catch (e) {
      console.error('Failed to save banner:', e);
    } finally {
      setSaving(false);
    }
  };

  const removeBanner = async () => {
    await saveBanner('', false);
    setDismissed(true);
  };

  // Admin edit button always visible if can manage, even when no banner
  if (loading) return null;

  // Not active and not a manager = nothing shown
  if (!bannerActive && !canManage) return null;

  // User dismissed it
  if (dismissed && !canManage) return null;

  return (
    <>
      {/* Edit modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-4 z-10">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-accent-amber" />
              Promotional Banner
            </h3>
            <p className="text-[10px] text-[#A1A1AA]">
              {selectedBranch ? (
                <span>Editing for branch: <strong className="text-accent-amber">{selectedBranch.nameEn} / {selectedBranch.nameAr}</strong>. This banner appears at the top of every page for visitors of this branch.</span>
              ) : (
                <span>Editing <strong className="text-primary-red">Global Banner</strong>. This banner appears for visitors who haven't selected a branch or as a fallback.</span>
              )}
            </p>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="e.g. 🎉 Get 15% OFF on your first order! Use code: FIRST15"
              rows={3}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-red/50 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 border border-[#27272A] rounded-xl text-xs font-bold text-text-muted hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={() => saveBanner(editValue, editValue.trim().length > 0)}
                className="px-4 py-1.5 bg-primary-red text-white text-xs font-bold rounded-xl hover:bg-primary-red-hover flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? '...' : <><Check className="h-3 w-3" /> Publish</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner bar */}
      <div className="w-full z-40 relative overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #7C1D24 0%, #B52A37 40%, #E63946 60%, #F4A261 100%)' }}>

        {/* Animated shimmer */}
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', animation: 'shimmer 3s infinite', backgroundSize: '200% 100%' }} />

        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Megaphone className="h-3.5 w-3.5 text-white flex-shrink-0" />
            {bannerActive && bannerText ? (
              <span className="text-[11px] font-bold text-white truncate">{bannerText}</span>
            ) : canManage ? (
              <span className="text-[11px] font-bold text-white/60 italic">No banner active — click Edit to add one</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {canManage && (
              <>
                <button
                  onClick={() => { setEditValue(bannerText || ''); setIsEditing(true); }}
                  className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                  title="Edit banner"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {bannerActive && (
                  <button
                    onClick={removeBanner}
                    className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                    title="Remove banner"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
            {bannerActive && !canManage && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
}
