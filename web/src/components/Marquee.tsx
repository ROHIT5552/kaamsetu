'use client';

import React from 'react';

const RECENT_JOBS = [
  { emoji: '🔧', text: 'Kitchen leak & flush valve fixed in Garkheda', rate: '₹700' },
  { emoji: '💡', text: 'Main MCB switchboard rewired on Jalna Road', rate: '₹800' },
  { emoji: '🪚', text: '3 Solid teakwood doors aligned in Osmanpura', rate: '₹900' },
  { emoji: '🖌️', text: 'Weatherproof exterior primer coat in Beed Bypass', rate: '₹650' },
  { emoji: '🧱', text: 'Granite kitchen platform repaired in Samarth Nagar', rate: '₹850' },
  { emoji: '🧰', text: 'Workshop loading and debris clearing in Waluj', rate: '₹450' },
  { emoji: '🔧', text: 'Overhead tank float valve connection in CIDCO N-3', rate: '₹550' },
  { emoji: '💡', text: 'Geyser & AC point installation on Jalna Road', rate: '₹950' },
];

export default function Marquee() {
  return (
    <div className="w-full bg-ink text-white py-3 overflow-hidden border-y border-line/20 select-none">
      <div className="flex w-max animate-marquee gap-8">
        {[...RECENT_JOBS, ...RECENT_JOBS].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs font-medium text-white/90 shrink-0"
          >
            <span className="text-base">{item.emoji}</span>
            <span>{item.text}</span>
            <span className="font-bold text-yel font-baloo text-sm">{item.rate}</span>
            <span className="text-white/30 text-lg">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
