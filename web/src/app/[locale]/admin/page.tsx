'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { fetchApi } from '@/lib/api';
import { ShieldCheck, Check, AlertCircle, Phone, MapPin } from 'lucide-react';
import { SKILLS_DATA } from '@kaamsetu/shared';

export default function AdminPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const { user, setUser, addToast } = useStore();

  const [pendingWorkers, setPendingWorkers] = useState<any[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApi('/api/auth/me')
      .then((res) => {
        if (!res.user || res.user.role !== 'ADMIN') {
          addToast('Access denied: Admin credentials required', 'error');
          router.push(`/${locale}/login`);
        } else {
          setUser(res.user);
          loadData();
        }
      })
      .catch(() => {
        router.push(`/${locale}/login`);
      });
  }, [locale, router, setUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetchApi('/api/admin/workers?pending=1'),
        fetchApi('/api/admin/workers'),
      ]);
      setPendingWorkers(pendingRes.workers || []);
      setAllWorkers(allRes.workers || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load admin data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (workerId: string) => {
    try {
      await fetchApi(`/api/admin/workers/${workerId}/verify`, { method: 'POST' });
      addToast('Worker verified successfully!', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to verify worker', 'error');
    }
  };

  const displayList = tab === 'PENDING' ? pendingWorkers : allWorkers;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-red-500" />
            <span>Admin Verification Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-mute">
            Review onboarding applications, verify identity & skill credentials, and activate local artisans.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-card border border-line rounded-xl p-1 gap-1 text-xs font-bold">
          <button
            onClick={() => setTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              tab === 'PENDING'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-mute hover:text-ink'
            }`}
          >
            Pending Verification ({pendingWorkers.length})
          </button>
          <button
            onClick={() => setTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              tab === 'ALL'
                ? 'bg-ink text-white dark:bg-yel dark:text-yelink shadow-sm'
                : 'text-mute hover:text-ink'
            }`}
          >
            All Workers ({allWorkers.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-mute text-sm bg-card rounded-2xl border border-line animate-pulse">
          Loading worker records...
        </div>
      ) : displayList.length === 0 ? (
        <div className="py-12 text-center text-mute text-sm bg-card rounded-2xl border border-line p-6">
          <p>No {tab === 'PENDING' ? 'pending' : ''} worker profiles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayList.map((w) => {
            const skillInfo = SKILLS_DATA[w.skill] || SKILLS_DATA.helper;
            const workerName = w.name || w.user?.name;
            const workerPhone = w.phone || w.user?.phone;

            return (
              <div
                key={w.id}
                className="bg-card border border-line rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-baloo font-bold text-lg text-ink">
                        {workerName}
                      </h3>
                      <p className="text-xs text-mute">
                        {skillInfo.emoji} {skillInfo.en} · {w.yearsExp} yrs exp
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        w.verified
                          ? 'text-ok bg-ok/10 border-ok/30'
                          : 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      {w.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>

                  <p className="text-xs text-ink/80 bg-bg p-2.5 rounded-lg border border-line">
                    &ldquo;{w.about}&rdquo;
                  </p>

                  <div className="pt-2 text-xs text-mute space-y-1">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue" />
                      <span>{w.area}</span>
                    </p>
                    <p className="flex items-center gap-1 font-mono text-ink">
                      <Phone className="w-3.5 h-3.5 text-ok" />
                      <span>+91-{workerPhone}</span>
                    </p>
                    <p className="font-bold text-ink pt-1">
                      Rate: ₹{w.ratePerDay}/day · Visit: ₹{w.visitCharge}
                    </p>
                  </div>
                </div>

                {!w.verified && (
                  <div className="pt-2 border-t border-line/60">
                    <button
                      onClick={() => handleVerify(w.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-ok text-white hover:brightness-105 shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Verify & Activate Worker
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
