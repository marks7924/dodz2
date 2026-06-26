'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBranch, BranchInfo } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import {
  Plus, Edit2, Trash2, MapPin, Phone, Clock, ShieldAlert, Store,
  Users, Check, X, Search, ChevronDown, AlertTriangle, Activity
} from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface BranchFormData {
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
  mapUrl: string;
  status: 'OPEN' | 'CLOSED';
  isActive: boolean;
}

const defaultForm: BranchFormData = {
  nameEn: '',
  nameAr: '',
  addressEn: '',
  addressAr: '',
  phone: '',
  mapUrl: '',
  status: 'OPEN',
  isActive: true,
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function BranchManagementPage() {
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const { allBranches, refetchBranches } = useBranch();
  const { locale } = useLanguage();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // State
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<(BranchFormData & { id?: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<'BRANCHES' | 'ASSIGNMENTS'>('BRANCHES');
  const [searchUser, setSearchUser] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Access guard
  const isSuperAdmin = role && ['OWNER', 'HEAD_ADMIN', 'DEVELOPER'].includes(role);
  if (!mounted || authLoading) return null;
  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <>
        <Header />
        <main className="flex-grow max-w-md mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-5 text-white">
          <ShieldAlert className="h-10 w-10 text-primary-red" />
          <h1 className="text-xl font-black">Access Denied</h1>
          <p className="text-xs text-text-muted">Branch management is restricted to Owner, Head Admin, and Developer accounts.</p>
          <Link href="/admin" className="text-primary-red hover:underline text-xs font-bold">← Back to Admin</Link>
        </main>
        <Footer />
      </>
    );
  }

  // ─── Mutations ───────────────────────────────────

  const saveBranchMutation = useMutation({
    mutationFn: async (data: BranchFormData & { id?: string }) => {
      const payload = {
        name_en: data.nameEn,
        name_ar: data.nameAr,
        address_en: data.addressEn,
        address_ar: data.addressAr,
        phone: data.phone,
        map_url: data.mapUrl,
        status: data.status,
        is_active: data.isActive,
      };
      if (data.id) {
        const { error } = await supabase.from('branches').update(payload).eq('id', data.id);
        if (error) throw error;
        db.logActivity('EDITED_BRANCH', 'branch', data.id, { nameEn: data.nameEn });
      } else {
        const { error } = await supabase.from('branches').insert(payload);
        if (error) throw error;
        db.logActivity('CREATED_BRANCH', 'branch', '', { nameEn: data.nameEn });
      }
    },
    onSuccess: () => {
      refetchBranches();
      setIsEditingBranch(false);
      setEditingBranch(null);
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      db.logActivity('DELETED_BRANCH', 'branch', id);
    },
    onSuccess: () => refetchBranches(),
  });

  // ─── User search ──────────────────────────────────
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-search', searchUser],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('id, full_name, role, branch_id')
        .order('full_name');
      if (searchUser.trim()) {
        q = q.ilike('full_name', `%${searchUser}%`);
      }
      const { data } = await q.limit(20);
      return data || [];
    },
    enabled: activeTab === 'ASSIGNMENTS',
  });

  const { data: userAssignments = [] } = useQuery({
    queryKey: ['user-branch-assignments', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data } = await supabase
        .from('user_branch_assignments')
        .select('branch_id')
        .eq('user_id', selectedUserId);
      return (data || []).map((r: any) => r.branch_id as string);
    },
    enabled: !!selectedUserId,
  });

  const toggleAssignmentMutation = useMutation({
    mutationFn: async ({ userId, branchId, add }: { userId: string; branchId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from('user_branch_assignments').insert({ user_id: userId, branch_id: branchId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_branch_assignments').delete().eq('user_id', userId).eq('branch_id', branchId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-branch-assignments', selectedUserId] }),
  });

  // ─── Render ──────────────────────────────────────

  return (
    <>
      <Header />
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 pb-24 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Store className="h-6 w-6 text-primary-red" />
              {locale === 'en' ? 'Branch Management' : 'إدارة الفروع'}
            </h1>
            <p className="text-xs text-text-muted">
              {locale === 'en' ? `${allBranches.length} active branches` : `${allBranches.length} فروع نشطة`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="px-4 py-2 text-xs font-bold border border-card-border rounded-xl text-text-muted hover:text-white transition-colors">
              ← {locale === 'en' ? 'Admin Panel' : 'لوحة الإدارة'}
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#18181B] p-1 rounded-xl border border-card-border w-fit">
          {(['BRANCHES', 'ASSIGNMENTS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab ? 'bg-primary-red text-white' : 'text-text-muted hover:text-white hover:bg-card-border'
              }`}
            >
              {tab === 'BRANCHES'
                ? (locale === 'en' ? '🏪 Branches' : '🏪 الفروع')
                : (locale === 'en' ? '👥 User Assignments' : '👥 تعيين المستخدمين')}
            </button>
          ))}
        </div>

        {/* ─── BRANCHES TAB ─────────────────────────────────── */}
        {activeTab === 'BRANCHES' && (
          <div className="space-y-4">
            {/* Add button */}
            <button
              onClick={() => { setEditingBranch({ ...defaultForm }); setIsEditingBranch(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Add Branch' : 'إضافة فرع'}
            </button>

            {/* Branch Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allBranches.map((branch) => (
                <div key={branch.id} className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">{branch.nameEn}</h3>
                      <p className="text-xs text-text-muted">{branch.nameAr}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      branch.status === 'OPEN' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {branch.status}
                    </span>
                  </div>

                  {branch.addressEn && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-text-muted shrink-0 mt-0.5" />
                      <p className="text-[11px] text-text-muted">{branch.addressEn}</p>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-text-muted" />
                      <p className="text-[11px] text-text-muted">{branch.phone}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setEditingBranch({ ...branch, nameEn: branch.nameEn, nameAr: branch.nameAr });
                        setIsEditingBranch(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-card border border-card-border rounded-lg text-[11px] text-text-muted hover:text-white cursor-pointer transition-colors"
                    >
                      <Edit2 className="h-3 w-3" /> {locale === 'en' ? 'Edit' : 'تعديل'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${branch.nameEn}"?`)) deleteBranchMutation.mutate(branch.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-card border border-red-900/30 rounded-lg text-[11px] text-red-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> {locale === 'en' ? 'Delete' : 'حذف'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ASSIGNMENTS TAB ──────────────────────────────── */}
        {activeTab === 'ASSIGNMENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User list */}
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {locale === 'en' ? 'Select User' : 'اختر مستخدم'}
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder={locale === 'en' ? 'Search by name...' : 'ابحث بالاسم...'}
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full bg-[#18181B] text-xs pl-9 pr-3 py-2.5 rounded-xl text-white border border-card-border focus:outline-none placeholder:text-text-muted"
                />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {users.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      selectedUserId === u.id ? 'bg-primary-red/10 border border-primary-red/30 text-white' : 'hover:bg-card-border text-text-muted'
                    }`}
                  >
                    <span className="font-bold text-white block">{u.full_name || 'Unnamed'}</span>
                    <span className="text-[10px] opacity-70">{u.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Branch toggles */}
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {selectedUserId
                  ? (locale === 'en' ? 'Branch Access' : 'صلاحيات الفروع')
                  : (locale === 'en' ? 'Select a user first' : 'اختر مستخدم أولاً')}
              </h3>
              {selectedUserId ? (
                <div className="space-y-2">
                  {allBranches.map((branch) => {
                    const isAssigned = userAssignments.includes(branch.id);
                    return (
                      <div key={branch.id} className="flex items-center justify-between p-3 rounded-xl border border-card-border">
                        <div>
                          <p className="text-xs font-bold text-white">{branch.nameEn}</p>
                          <p className="text-[10px] text-text-muted">{branch.nameAr}</p>
                        </div>
                        <button
                          onClick={() => toggleAssignmentMutation.mutate({
                            userId: selectedUserId,
                            branchId: branch.id,
                            add: !isAssigned,
                          })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isAssigned ? 'bg-green-600 text-white' : 'bg-card-border text-text-muted hover:text-white'
                          }`}
                        >
                          {isAssigned ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-text-muted italic text-center py-8">
                  {locale === 'en' ? 'Select a user from the list to manage their branch access.' : 'اختر مستخدم من القائمة لإدارة صلاحيات الفروع الخاصة به.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── BRANCH FORM MODAL ──────────────────────────────────────────── */}
        {isEditingBranch && editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditingBranch(false)} />
            <form
              onSubmit={(e) => { e.preventDefault(); saveBranchMutation.mutate(editingBranch); }}
              className="relative w-full max-w-lg bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-extrabold text-white">
                {editingBranch.id ? (locale === 'en' ? 'Edit Branch' : 'تعديل الفرع') : (locale === 'en' ? 'Add New Branch' : 'إضافة فرع جديد')}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Name (EN)', key: 'nameEn', required: true },
                  { label: 'Name (AR)', key: 'nameAr', required: true },
                  { label: 'Address (EN)', key: 'addressEn' },
                  { label: 'Address (AR)', key: 'addressAr' },
                  { label: 'Phone', key: 'phone' },
                  { label: 'Map URL', key: 'mapUrl' },
                ].map(({ label, key, required }) => (
                  <div key={key} className={`space-y-1 ${key === 'addressEn' || key === 'addressAr' || key === 'mapUrl' ? 'col-span-2' : ''}`}>
                    <label className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">{label}</label>
                    <input
                      type="text"
                      value={(editingBranch as any)[key] || ''}
                      onChange={(e) => setEditingBranch({ ...editingBranch, [key]: e.target.value })}
                      required={required}
                      className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                    />
                  </div>
                ))}

                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Status</label>
                  <select
                    value={editingBranch.status}
                    onChange={(e) => setEditingBranch({ ...editingBranch, status: e.target.value as 'OPEN' | 'CLOSED' })}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Active</label>
                  <button
                    type="button"
                    onClick={() => setEditingBranch({ ...editingBranch, isActive: !editingBranch.isActive })}
                    className={`w-full text-xs rounded-xl px-3 py-2.5 font-bold transition-colors ${editingBranch.isActive ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-card-border text-text-muted border border-card-border'}`}
                  >
                    {editingBranch.isActive ? '✓ Active' : '✗ Inactive'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditingBranch(false)} className="flex-1 py-2.5 border border-card-border text-text-muted text-xs font-bold rounded-xl hover:text-white transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saveBranchMutation.isPending} className="flex-1 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50">
                  {saveBranchMutation.isPending ? 'Saving...' : (editingBranch.id ? 'Save Changes' : 'Create Branch')}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
