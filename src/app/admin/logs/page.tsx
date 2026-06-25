'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ShieldAlert, Loader2, List, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function LogsPage() {
  const { locale, t } = useLanguage();
  const { role, isLoading: authLoading, isAuthenticated } = useAuth();
  const supabase = createClient();

  const { data: logs = [], isLoading: dataLoading } = useQuery({
    queryKey: ['admin-logs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && ['ADMIN', 'OWNER', 'DEVELOPER'].includes(role || ''),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
      </div>
    );
  }

  const isAuthorized = isAuthenticated && ['ADMIN', 'OWNER', 'DEVELOPER'].includes(role || '');

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
                ? 'Only Administrators, Developers, and Restaurant Owners can view system audit logs.'
                : 'يسمح فقط للمسؤولين والمطورين ومالكي المطعم بعرض سجلات تدقيق النظام.'}
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 min-h-screen text-white">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <span>{locale === 'en' ? 'System Audit Logs' : 'سجلات تدقيق النظام'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary-red/10 text-primary-red border border-primary-red/20">
              Audit
            </span>
          </h1>
          <p className="text-xs text-text-muted">
            {locale === 'en'
              ? 'View the logs of all administrative actions performed on the platform.'
              : 'عرض سجلات جميع الإجراءات الإدارية التي تم إجراؤها على المنصة.'}
          </p>
        </div>

        {dataLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 text-primary-red animate-spin" />
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[#18181B] text-text-muted border-b border-card-border">
                  <tr>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Time' : 'الوقت'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Actor' : 'الفاعل'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Action' : 'الإجراء'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Resource' : 'المورد'}</th>
                    <th className="p-4 font-bold">{locale === 'en' ? 'Metadata' : 'البيانات الإضافية'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-muted italic">
                        {locale === 'en' ? 'No audit logs found.' : 'لم يتم العثور على سجلات تدقيق.'}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-card-border/20 transition-all text-white">
                        <td className="p-4 font-mono text-[10px] text-text-muted">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold">
                          <div>{log.actor_email || 'System'}</div>
                          <div className="text-[10px] font-mono text-text-muted">{log.actor_id || ''}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-card-border uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-text-muted">
                          <div>{log.resource_type}</div>
                          <div className="text-[10px] font-mono">{log.resource_id}</div>
                        </td>
                        <td className="p-4">
                          <pre className="text-[10px] font-mono text-accent-amber max-w-xs overflow-auto bg-[#18181B] p-2 rounded-xl border border-card-border/50">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
