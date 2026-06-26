'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ShieldAlert, Plus, Edit2, Trash2, Shield, UserX, UserCheck, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Role hierarchy — higher index = higher rank
const ROLE_HIERARCHY: Record<string, number> = {
  CUSTOMER: 0,
  DRIVER: 1,
  STAFF: 2,
  ADMIN: 3,
  HEAD_ADMIN: 4,
  OWNER: 5,
  DEVELOPER: 6,
};

// Roles each level CAN assign (they can only assign roles strictly below themselves)
function getAssignableRoles(myRole: string): string[] {
  const myLevel = ROLE_HIERARCHY[myRole] ?? -1;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level < myLevel)
    .map(([r]) => r)
    .sort((a, b) => (ROLE_HIERARCHY[b] ?? 0) - (ROLE_HIERARCHY[a] ?? 0));
}

// Display labels for roles
const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Developer',
  OWNER: 'Owner',
  HEAD_ADMIN: 'Head Admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  DRIVER: 'Driver',
  CUSTOMER: 'Customer',
};

export default function UserManagementPage() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const { role, user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState<string>('CUSTOMER');
  const [branchId, setBranchId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['admin-branches-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Access levels that can view users
  const ACCESS_ROLES = ['ADMIN', 'HEAD_ADMIN', 'OWNER', 'DEVELOPER'];

  // Fetch all profiles, filtering based on viewer's rank
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-list', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const myLevel = ROLE_HIERARCHY[role || ''] ?? -1;

      // Filter out users with same or higher rank than viewer (DEV/OWNER not shown to non-DEV)
      return (data || []).filter((u: any) => {
        const userLevel = ROLE_HIERARCHY[u.role] ?? 0;
        // DEVELOPER can see everyone; others can only see users strictly below them
        if (role === 'DEVELOPER') return true;
        return userLevel < myLevel;
      });
    },
    enabled: isAuthenticated && ACCESS_ROLES.includes(role || ''),
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsAddingUser(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsEditingUser(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setUserRole('CUSTOMER');
    setBranchId('');
    setFormError('');
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setFullName(user.full_name);
    setPhone(user.phone || '');
    setUserRole(user.role);
    setBranchId(user.branch_id || '');
    setIsEditingUser(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    createUserMutation.mutate({
      email,
      password,
      fullName,
      phone,
      role: userRole,
      branchId: branchId || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    updateUserMutation.mutate({
      id: selectedUser.id,
      updates: {
        fullName,
        phone,
        role: userRole,
        branchId: branchId || null,
      },
    });
  };

  const toggleSuspension = (user: any) => {
    updateUserMutation.mutate({
      id: user.id,
      updates: {
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        branchId: user.branch_id,
        isSuspended: !user.is_suspended,
      },
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
      </div>
    );
  }

  // Access check
  const isAuthorized = isAuthenticated && ACCESS_ROLES.includes(role || '');

  if (!isAuthorized) {
    return (
      <>
        <Header />
        <main className="flex-grow max-w-md mx-auto px-4 py-16 flex flex-col justify-center items-center text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-primary-red/10 text-primary-red flex items-center justify-center border border-primary-red/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{locale === 'en' ? 'Access Denied' : 'غير مسموح بالدخول'}</h1>
            <p className="text-xs text-text-muted">
              {locale === 'en'
                ? 'Only Administrators, Head Admins, Developers, and Restaurant Owners can manage users.'
                : 'يسمح فقط للمسؤولين والمسؤولين الرئيسيين والمطورين ومالكي المطعم بإدارة المستخدمين.'}
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const assignableRoles = getAssignableRoles(role || '');

  // Role badge colour map
  const ROLE_COLORS: Record<string, string> = {
    DEVELOPER: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    OWNER:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
    HEAD_ADMIN:'bg-pink-500/10 text-pink-400 border-pink-500/20',
    ADMIN:     'bg-primary-red/10 text-primary-red border-primary-red/20',
    STAFF:     'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
    DRIVER:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CUSTOMER:  'bg-green-500/10 text-green-400 border-green-500/20',
  };

  return (
    <>
      <Header />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              <span>{locale === 'en' ? 'User Management' : 'إدارة المستخدمين'}</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
                RBAC
              </span>
            </h1>
            <p className="text-xs text-text-muted">
              {locale === 'en'
                ? `Role hierarchy: Dev › Owner › Head Admin › Admin › Staff › Driver › Customer. You can manage roles below ${ROLE_LABELS[role || ''] || role}.`
                : 'التسلسل الهرمي: مطور › مالك › مسؤول رئيسي › مسؤول › موظف › سائق › عميل.'}
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsAddingUser(true);
            }}
            className="px-4 py-2.5 bg-primary-red hover:bg-primary-red-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary-red/25 self-start sm:self-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>{locale === 'en' ? 'Create User' : 'إنشاء حساب'}</span>
          </button>
        </div>

        {usersLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                  <tr>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Name' : 'الاسم'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Phone' : 'الهاتف'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Role' : 'الدور'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Branch' : 'الفرع'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                    <th className="p-4 font-bold text-center">{locale === 'en' ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-card-border/20 transition-all text-white">
                      <td className="p-4 font-bold">{u.full_name || 'N/A'}</td>
                      <td className="p-4 text-text-muted font-mono">{u.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${ROLE_COLORS[u.role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="p-4 text-text-muted">
                        {(() => {
                          const br = branches.find((b: any) => b.id === u.branch_id);
                          return br ? (locale === 'en' ? br.name_en : br.name_ar) : '-';
                        })()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.is_suspended
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}
                        >
                          {u.is_suspended
                            ? (locale === 'en' ? 'Suspended' : 'معلق')
                            : (locale === 'en' ? 'Active' : 'نشط')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleSuspension(u)}
                            className="p-1.5 rounded bg-[#18181B] border border-card-border text-text-muted hover:text-white transition-colors"
                            title={u.is_suspended ? 'Activate User' : 'Suspend User'}
                          >
                            {u.is_suspended ? <UserCheck className="h-3.5 w-3.5 text-green-500" /> : <UserX className="h-3.5 w-3.5 text-red-500" />}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded bg-[#18181B] border border-card-border text-text-muted hover:text-white transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(locale === 'en' ? 'Delete this user permanently?' : 'حذف هذا المستخدم نهائياً؟')) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            className="p-1.5 rounded bg-[#18181B] border border-card-border text-text-muted hover:text-primary-red transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Dialog for Adding User */}
        {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsAddingUser(false)} />
            <form
              onSubmit={handleCreateSubmit}
              className="relative w-full max-w-md bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-white"
            >
              <h3 className="text-base font-extrabold text-white">
                {locale === 'en' ? 'Create New User' : 'إنشاء حساب جديد'}
              </h3>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {formError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Branch Assignment</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  >
                    <option value="">None (All / Corporate)</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {locale === 'en' ? b.name_en : b.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-4 py-2 border border-card-border rounded-xl text-xs font-bold text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 bg-primary-red text-white text-xs font-bold rounded-xl hover:bg-primary-red-hover flex items-center gap-1.5"
                >
                  {createUserMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Dialog for Editing User */}
        {isEditingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsEditingUser(false)} />
            <form
              onSubmit={handleEditSubmit}
              className="relative w-full max-w-md bg-card border border-card-border rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-white"
            >
              <h3 className="text-base font-extrabold text-white">
                {locale === 'en' ? 'Edit User Profile' : 'تعديل حساب المستخدم'}
              </h3>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {formError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Branch Assignment</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full text-xs bg-[#18181B] border border-card-border rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary-red/50"
                  >
                    <option value="">None (All / Corporate)</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {locale === 'en' ? b.name_en : b.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingUser(false)}
                  className="px-4 py-2 border border-card-border rounded-xl text-xs font-bold text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 bg-primary-red text-white text-xs font-bold rounded-xl hover:bg-primary-red-hover flex items-center gap-1.5"
                >
                  {updateUserMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save Changes
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
