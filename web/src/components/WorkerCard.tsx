'use client';

import React from 'react';
import { SKILLS_DATA } from '@kaamsetu/shared';
import { useStore } from '@/store/useStore';
import { useTilt } from '@/hooks/useTilt';
import { Phone, Calendar, Eye, Star, ShieldCheck, Check } from 'lucide-react';
import Image from 'next/image';

interface WorkerCardProps {
  worker: any;
  locale: string;
  t: {
    yrs: string;
    jobs: string;
    ver: string;
    unv: string;
    perDay: string;
    visit: string;
    free: string;
    view: string;
    book: string;
    call: string;
    cmp: string;
    today: string;
    tomorrow: string;
    week: string;
  };
}

export default function WorkerCard({ worker, locale, t }: WorkerCardProps) {
  const cardRef = useTilt<HTMLDivElement>(6);
  const {
    user,
    compareIds,
    toggleCompare,
    setActiveWorkerDialog,
    setActiveBookingDialog,
    openAuthModal,
    addToast,
  } = useStore();

  const skillInfo = SKILLS_DATA[worker.skill] || SKILLS_DATA.helper;
  const isCompared = compareIds.includes(worker.id);
  const skillLabel = locale === 'mr' ? skillInfo.mr : skillInfo.en;

  const handleCallClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      addToast('Sign in to reveal full contact details and call directly', 'info');
      openAuthModal();
    }
  };

  const getAvailLabel = (av: string) => {
    if (av === 'today') return t.today;
    if (av === 'tomorrow') return t.tomorrow;
    return t.week;
  };

  // Avatar tile color calculation matching prototype
  const tileBackground = `hsl(${skillInfo.hue % 360}, 70%, 75%)`;

  return (
    <article
      ref={cardRef}
      className="bg-card border border-line rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
    >
      {/* Photo Thumbnails Header if available */}
      {worker.photos && worker.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1 -mx-4 -mt-4 mb-2 overflow-hidden rounded-t-2xl border-b border-line">
          {worker.photos.slice(0, 3).map((url: string, i: number) => (
            <div key={i} className="relative h-24 w-full bg-line/20 overflow-hidden">
              <img
                src={url}
                alt={`${worker.name} work sample ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Top Details & Avatar */}
      <div className="flex items-start gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner"
          style={{ backgroundColor: tileBackground }}
          aria-hidden="true"
        >
          {skillInfo.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-baloo font-bold text-lg text-ink truncate leading-tight">
            {worker.name}
          </h3>
          <p className="text-xs text-mute truncate mt-0.5">
            {skillLabel} · {worker.yearsExp} {t.yrs} · {worker.area}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-bold text-amber-500 dark:text-yel flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              {Number(worker.ratingAvg).toFixed(1)}
            </span>
            <span className="text-xs text-mute">
              ({worker.jobsCount} {t.jobs})
            </span>
          </div>
        </div>
      </div>

      {/* Badges: Verification & Availability */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span
          className={`px-2.5 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
            worker.verified
              ? 'text-ok border-ok/30 bg-ok/10'
              : 'text-mute border-line bg-bg'
          }`}
        >
          {worker.verified ? (
            <>
              <Check className="w-3 h-3 stroke-[2.5]" />
              {t.ver}
            </>
          ) : (
            t.unv
          )}
        </span>

        <span className="px-2.5 py-0.5 rounded-md text-ink/70 bg-bg border border-line font-medium">
          {getAvailLabel(worker.availability)}
        </span>
      </div>

      {/* Pricing Band */}
      <div className="flex items-baseline justify-between pt-2 border-t border-line/60">
        <div className="font-baloo text-xl font-extrabold text-ink">
          ₹{worker.ratePerDay}{' '}
          <small className="font-sans font-normal text-xs text-mute">{t.perDay}</small>
        </div>
        <div className="text-xs text-mute font-medium">
          {worker.visitCharge > 0 ? `${t.visit} ₹${worker.visitCharge}` : t.free}
        </div>
      </div>

      {/* Action Buttons & Compare Checkbox */}
      <div className="flex items-center gap-2 flex-wrap pt-2">
        <button
          type="button"
          onClick={() => setActiveWorkerDialog(worker)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-bg hover:bg-line/30 text-ink transition-colors flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          {t.view}
        </button>

        <button
          type="button"
          onClick={() => setActiveBookingDialog(worker)}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-yel text-yelink hover:brightness-105 transition-all flex items-center gap-1 shadow-sm"
        >
          <Calendar className="w-3.5 h-3.5" />
          {t.book}
        </button>

        {user && worker.phone ? (
          <a
            href={`tel:${worker.phone}`}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-bg hover:bg-line/30 text-ink transition-colors flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" />
            {t.call}
          </a>
        ) : (
          <button
            type="button"
            onClick={handleCallClick}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-bg hover:bg-line/30 text-ink transition-colors flex items-center gap-1"
            title="Sign in to call"
          >
            <Phone className="w-3.5 h-3.5" />
            {t.call}
          </button>
        )}

        {/* Compare Checkbox */}
        <label className="ml-auto text-xs font-medium text-mute hover:text-ink flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isCompared}
            onChange={() => toggleCompare(worker.id)}
            className="w-3.5 h-3.5 rounded border-line text-blue focus:ring-blue cursor-pointer"
          />
          {t.cmp}
        </label>
      </div>
    </article>
  );
}
