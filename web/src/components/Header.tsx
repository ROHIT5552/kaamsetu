'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import ThemeToggle from './ThemeToggle';
import LangToggle from './LangToggle';
import { User, LogOut, ShieldCheck, Briefcase } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HeaderProps {
  locale: string;
  t: {
    find: string;
    join: string;
    login: string;
    account: string;
    dashboard: string;
    admin: string;
    logout: string;
  };
}

export default function Header({ locale, t }: HeaderProps) {
  const pathname = usePathname();
  const { user, setUser, openAuthModal, addToast } = useStore();

  const isFindActive = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isJoinActive = pathname.includes('/join');

  const handleLogout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
      setUser(null);
      addToast('Logged out successfully', 'info');
    } catch (e) {
      setUser(null);
    }
  };

  return (
    <header className="bg-ink text-white border-b border-line/20 sticky top-0 z-40 transition-colors">
      <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link
          href={`/${locale}`}
          className="font-baloo font-extrabold text-2xl tracking-tight text-white hover:opacity-90 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-yel rounded-lg"
          aria-label="KaamSetu Homepage"
        >
          Kaam<b className="text-yel font-extrabold">Setu</b>
          <span className="text-[10px] font-sans font-medium uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded text-white/70 ml-1 hidden sm:inline">
            Aurangabad
          </span>
        </Link>

        {/* Navigation & Actions */}
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main Navigation">
          <Link
            href={`/${locale}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              isFindActive
                ? 'bg-yel text-yelink font-bold shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10 border border-white/20'
            }`}
          >
            {t.find}
          </Link>

          <Link
            href={`/${locale}/join`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              isJoinActive
                ? 'bg-yel text-yelink font-bold shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10 border border-white/20'
            }`}
          >
            {t.join}
          </Link>

          {/* User Role Links */}
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && (
                <Link
                  href={`/${locale}/admin`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t.admin}</span>
                </Link>
              )}

              {user.role === 'WORKER' && (
                <Link
                  href={`/${locale}/worker/dashboard`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue/20 text-blue-200 border border-blue/30 hover:bg-blue/30 flex items-center gap-1"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t.dashboard}</span>
                </Link>
              )}

              <Link
                href={`/${locale}/account`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/20 flex items-center gap-1"
                title={user.name}
              >
                <User className="w-3.5 h-3.5 text-yel" />
                <span className="hidden md:inline truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                title={t.logout}
                aria-label={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/40 text-white hover:border-yel hover:text-yel transition-colors"
            >
              {t.login}
            </button>
          )}

          {/* Language Toggle */}
          <LangToggle currentLocale={locale} />

          {/* Theme Toggle */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
