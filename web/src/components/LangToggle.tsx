'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface LangToggleProps {
  currentLocale: string;
}

export default function LangToggle({ currentLocale }: LangToggleProps) {
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = currentLocale === 'en' ? 'mr' : 'en';
    // Replace current locale prefix in pathname
    const segments = pathname.split('/');
    if (segments[1] === 'en' || segments[1] === 'mr') {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }
    const newPath = segments.join('/') || `/${nextLocale}`;
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-white/30 text-white hover:border-yel hover:text-yel transition-colors cursor-pointer"
      aria-label={`Switch to ${currentLocale === 'en' ? 'Marathi' : 'English'}`}
    >
      {currentLocale === 'en' ? 'मराठी' : 'English'}
    </button>
  );
}
