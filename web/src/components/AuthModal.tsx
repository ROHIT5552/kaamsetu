'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { X, Smartphone, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AuthModalProps {
  t: {
    authModalTitle: string;
    phoneTab: string;
    emailTab: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    namePlaceholder: string;
    sendOtp: string;
    verifyOtp: string;
    enterOtp: string;
    resendOtp: string;
    privacyConsent: string;
  };
}

export default function AuthModal({ t }: AuthModalProps) {
  const { authModalOpen, closeAuthModal, setUser, addToast } = useStore();

  const [tab, setTab] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!authModalOpen) return null;

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

      // In dev mode, auto-fill debug code if available
      if (res.debugCode) {
        setCode(res.debugCode);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to send OTP. Please try again.', 'error');
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
      addToast(`Welcome back, ${res.user.name}!`, 'success');
      closeAuthModal();
      // Reset state
      setStep('REQUEST');
      setCode('');
      setTarget('');
    } catch (err: any) {
      addToast(err.message || 'Invalid OTP code. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-card text-ink rounded-2xl max-w-md w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 id="auth-modal-title" className="font-baloo text-xl font-bold flex items-center gap-1.5">
            <span>Kaam</span>
            <span className="text-yel">Setu</span>
            <span className="text-xs font-sans text-mute font-normal ml-1">· {t.authModalTitle}</span>
          </h2>
          <button
            onClick={closeAuthModal}
            className="text-mute hover:text-ink p-1 rounded-lg"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        {step === 'REQUEST' && (
          <div className="grid grid-cols-2 p-3 pb-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setTab('PHONE');
                setTarget('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'PHONE'
                  ? 'bg-ink text-white dark:bg-yel dark:text-yelink shadow-sm'
                  : 'bg-bg text-mute hover:text-ink border border-line'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {t.phoneTab}
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
                  : 'bg-bg text-mute hover:text-ink border border-line'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              {t.emailTab}
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  {tab === 'PHONE' ? 'Mobile Number' : 'Email Address'}
                </label>
                <div className="relative">
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
                        placeholder={t.phonePlaceholder}
                        required
                        className="w-full bg-bg border border-line rounded-r-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue font-mono"
                      />
                    </div>
                  ) : (
                    <input
                      type="email"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      required
                      className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                />
              </div>

              <p className="text-xs text-mute leading-relaxed">
                {t.privacyConsent}
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {isLoading ? 'Sending...' : t.sendOtp}
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
                  Enter the 6-digit code sent to <b className="text-ink">{target}</b>
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
                  {cooldown > 0 ? `${t.resendOtp} in ${cooldown}s` : t.resendOtp}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md transition-all disabled:opacity-60"
              >
                {isLoading ? 'Verifying...' : t.verifyOtp}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
