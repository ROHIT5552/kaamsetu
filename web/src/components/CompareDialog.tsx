'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { SKILLS_DATA } from '@kaamsetu/shared';
import { X, Check } from 'lucide-react';

interface CompareDialogProps {
  workers: any[];
  locale: string;
  t: {
    cG: string;
    cN: string;
    clear: string;
    rows: string[];
    book: string;
    yrs: string;
    today: string;
    tomorrow: string;
    week: string;
  };
}

export default function CompareDialog({ workers, locale, t }: CompareDialogProps) {
  const { compareIds, clearCompare, setActiveBookingDialog } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  if (compareIds.length === 0) return null;

  const comparedWorkers = workers.filter((w) => compareIds.includes(w.id));

  const getAvail = (av: string) => {
    if (av === 'today') return t.today;
    if (av === 'tomorrow') return t.tomorrow;
    return t.week;
  };

  return (
    <>
      {/* Fixed Sticky Bottom Bar */}
      <div className="fixed left-0 right-0 bottom-0 bg-ink text-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] flex items-center justify-center gap-3 z-30 shadow-2xl border-t border-line/30 animate-in slide-in-from-bottom-2">
        <span className="text-sm font-semibold">
          {compareIds.length} {t.cN}
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-1.5 text-xs font-bold rounded-lg bg-yel text-yelink hover:brightness-105 transition-all shadow-sm"
        >
          {t.cG}
        </button>
        <button
          onClick={clearCompare}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/30 text-white/80 hover:text-white hover:bg-white/10"
        >
          {t.clear}
        </button>
      </div>

      {/* Comparison Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
        >
          <div className="bg-card text-ink rounded-2xl max-w-4xl w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 id="compare-modal-title" className="font-baloo text-xl font-bold">
                {t.cG}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-mute hover:text-ink p-1 rounded-lg"
                aria-label="Close comparison"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="p-3 text-mute font-medium w-32"></th>
                    {comparedWorkers.map((w) => (
                      <th key={w.id} className="p-3 font-baloo text-base font-bold text-ink">
                        {w.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {/* Skill */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[0]}</td>
                    {comparedWorkers.map((w) => {
                      const meta = SKILLS_DATA[w.skill] || SKILLS_DATA.helper;
                      return (
                        <td key={w.id} className="p-3 font-semibold">
                          {meta.emoji} {locale === 'mr' ? meta.mr : meta.en}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Rate per day */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[1]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3 font-baloo font-bold text-base text-ink">
                        ₹{w.ratePerDay}
                      </td>
                    ))}
                  </tr>

                  {/* Visit Charge */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[2]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3">
                        {w.visitCharge ? `₹${w.visitCharge}` : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Rating */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[3]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3 text-amber-500 font-bold">
                        ★ {Number(w.ratingAvg).toFixed(1)} ({w.jobsCount})
                      </td>
                    ))}
                  </tr>

                  {/* Experience */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[4]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3">
                        {w.yearsExp} {t.yrs}
                      </td>
                    ))}
                  </tr>

                  {/* Area */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[5]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3">
                        {w.area}
                      </td>
                    ))}
                  </tr>

                  {/* Availability */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[6]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3">
                        <span className="px-2 py-0.5 rounded bg-bg border border-line text-xs font-medium">
                          {getAvail(w.availability)}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Verified */}
                  <tr>
                    <td className="p-3 text-mute font-medium">{t.rows[7]}</td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3">
                        {w.verified ? <Check className="w-5 h-5 text-ok stroke-[2.5]" /> : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Actions */}
                  <tr>
                    <td className="p-3"></td>
                    {comparedWorkers.map((w) => (
                      <td key={w.id} className="p-3">
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            setActiveBookingDialog(w);
                          }}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-yel text-yelink hover:brightness-105 shadow-sm"
                        >
                          {t.book}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
