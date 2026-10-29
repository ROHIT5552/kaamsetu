'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useStore } from '@/store/useStore';
import { Smartphone, Mail, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();
  const router = useRouter();
  const { setUser, addToast } = useStore();

  const [tab, setTab] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === 'PHONE' && !/^[6-9]\d{9}$/.test(target)) {
      addToast('Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchApi('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({
          target: target.trim(),
          type: tab,
        }),
      });

      addToast(res.message, 'success');
      setStep('VERIFY');
      setCooldown(30);

      if (res.debugCode) {
        setCode(res.debugCode);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to send OTP.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      addToast('Please enter a valid 6-digit OTP.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchApi('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          target: target.trim(),
          code: code.trim(),
          name: name.trim() || undefined,
        }),
      });

      setUser(res.user);
      addToast(`Welcome, ${res.user.name}!`, 'success');

      if (res.user.role === 'ADMIN') {
        router.push(`/${locale}/admin`);
      } else if (res.user.role === 'WORKER') {
        router.push(`/${locale}/worker/dashboard`);
      } else {
        router.push(`/${locale}/account`);
      }
    } catch (err: any) {
      addToast(err.message || 'Invalid verification code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto px-4 py-16">
      <div className="bg-card border border-line rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="text-center mb-6">
          <h1 className="font-baloo text-2xl sm:text-3xl font-extrabold text-ink mb-1">
            Sign in to Kaam<b className="text-yel">Setu</b>
          </h1>
          <p className="text-xs text-mute">
            Access bookings, live tracking, and direct worker contacts in Aurangabad.
          </p>
        </div>

        {/* Tab Selector */}
        {step === 'REQUEST' && (
          <div className="grid grid-cols-2 p-1 bg-bg border border-line rounded-xl mb-5 gap-1">
            <button
              type="button"
              onClick={() => {
                setTab('PHONE');
                setTarget('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'PHONE'
                  ? 'bg-ink text-white dark:bg-yel dark:text-yelink shadow-sm'
                  : 'text-mute hover:text-ink'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('EMAIL');
                setTarget('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'EMAIL'
                  ? 'bg-ink text-white dark:bg-yel dark:text-yelink shadow-sm'
                  : 'text-mute hover:text-ink'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email OTP
            </button>
          </div>
        )}

        {step === 'REQUEST' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-mute mb-1">
                {tab === 'PHONE' ? 'Indian Mobile Number' : 'Email Address'}
              </label>
              {tab === 'PHONE' ? (
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-line bg-bg text-xs font-semibold text-mute">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={target}
                    onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    required
                    className="w-full bg-bg border border-line rounded-r-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue font-mono"
                  />
                </div>
              ) : (
                <input
                  type="email"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-mute mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Kulkarni"
                className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
              />
            </div>

            <p className="text-xs text-mute">
              By proceeding, you agree to KaamSetu's Terms & Conditions.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isLoading ? 'Sending...' : 'Send 6-digit Code'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center pb-2">
              <div className="w-12 h-12 bg-yel/20 text-yelink dark:text-yel rounded-full flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <p className="text-xs text-mute">
                Enter the 6-digit verification code sent to <b className="text-ink">{target}</b>
              </p>
            </div>

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                autoFocus
                className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[8px] font-mono text-ink focus:ring-2 focus:ring-blue"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('REQUEST')}
                className="text-mute hover:text-ink underline"
              >
                Change {tab === 'PHONE' ? 'number' : 'email'}
              </button>

              <button
                type="button"
                disabled={cooldown > 0}
                onClick={handleRequestOtp}
                className="text-blue font-semibold disabled:text-mute"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md transition-all disabled:opacity-60"
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
