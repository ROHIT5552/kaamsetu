'use client';

import React from 'react';
import { ShieldCheck, IndianRupee, Navigation, HandCoins, Sparkles } from 'lucide-react';

interface WhyBentoProps {
  t: {
    whyTitle: string;
    why1Title: string;
    why1Desc: string;
    why2Title: string;
    why2Desc: string;
    why3Title: string;
    why3Desc: string;
    why4Title: string;
    why4Desc: string;
  };
}

export default function WhyBento({ t }: WhyBentoProps) {
  return (
    <section className="py-12 border-t border-line/60">
      <div className="max-w-[1100px] mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yel/20 text-yelink dark:text-yel mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chhatrapati Sambhajinagar (Aurangabad)</span>
          </div>
          <h2 className="font-baloo text-2xl sm:text-3xl font-extrabold text-ink">
            {t.whyTitle}
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Verified */}
          <div className="bg-card border border-line rounded-2xl p-5 shadow-sm hover:border-blue/50 transition-colors flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-ok/10 text-ok flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-baloo text-lg font-bold text-ink mb-1.5">{t.why1Title}</h3>
              <p className="text-xs text-mute leading-relaxed">{t.why1Desc}</p>
            </div>
          </div>

          {/* Card 2: Upfront Pricing */}
          <div className="bg-card border border-line rounded-2xl p-5 shadow-sm hover:border-yel/80 transition-colors flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-yel/20 text-yelink dark:text-yel flex items-center justify-center mb-4">
              <IndianRupee className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-baloo text-lg font-bold text-ink mb-1.5">{t.why2Title}</h3>
              <p className="text-xs text-mute leading-relaxed">{t.why2Desc}</p>
            </div>
          </div>

          {/* Card 3: Live GPS */}
          <div className="bg-card border border-line rounded-2xl p-5 shadow-sm hover:border-blue/50 transition-colors flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center mb-4">
              <Navigation className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-baloo text-lg font-bold text-ink mb-1.5">{t.why3Title}</h3>
              <p className="text-xs text-mute leading-relaxed">{t.why3Desc}</p>
            </div>
          </div>

          {/* Card 4: Zero Middleman Cut */}
          <div className="bg-card border border-line rounded-2xl p-5 shadow-sm hover:border-ok/50 transition-colors flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-ok/10 text-ok flex items-center justify-center mb-4">
              <HandCoins className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-baloo text-lg font-bold text-ink mb-1.5">{t.why4Title}</h3>
              <p className="text-xs text-mute leading-relaxed">{t.why4Desc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
