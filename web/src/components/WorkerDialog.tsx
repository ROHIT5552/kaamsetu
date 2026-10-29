'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { SKILLS_DATA } from '@kaamsetu/shared';
import { X, Star, Check, Phone, Calendar, ArrowLeft } from 'lucide-react';

interface WorkerDialogProps {
  locale: string;
  t: {
    yrs: string;
    jobs: string;
    ver: string;
    unv: string;
    about: string;
    work: string;
    rev: string;
    book: string;
    call: string;
    sample: string;
    signInToCall: string;
  };
}

export default function WorkerDialog({ locale, t }: WorkerDialogProps) {
  const {
    activeWorkerDialog: worker,
    setActiveWorkerDialog,
    setActiveBookingDialog,
    user,
    openAuthModal,
    addToast,
  } = useStore();

  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  if (!worker) return null;

  const skillInfo = SKILLS_DATA[worker.skill] || SKILLS_DATA.helper;
  const skillLabel = locale === 'mr' ? skillInfo.mr : skillInfo.en;

  const handleCall = () => {
    if (!user) {
      addToast(t.signInToCall, 'info');
      openAuthModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="worker-dialog-title"
    >
      <div className="bg-card text-ink rounded-2xl max-w-xl w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            {zoomedPhoto && (
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-1 text-mute hover:text-ink mr-1 rounded"
                aria-label="Back to gallery"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 id="worker-dialog-title" className="font-baloo text-xl font-bold">
              {zoomedPhoto ? (locale === 'mr' ? 'कामाचा नमुना' : 'Work Sample') : worker.name}
            </h2>
          </div>
          <button
            onClick={() => {
              setZoomedPhoto(null);
              setActiveWorkerDialog(null);
            }}
            className="text-mute hover:text-ink p-1 rounded-lg"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {zoomedPhoto ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-line bg-black/5">
                <img
                  src={zoomedPhoto}
                  alt="Enlarged work sample"
                  className="w-full max-h-[60vh] object-contain mx-auto"
                />
              </div>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-line bg-bg hover:bg-line/20 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                {locale === 'mr' ? 'मागे जा' : 'Back to details'}
              </button>
            </div>
          ) : (
            <>
              {/* Meta info */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-mute pb-3 border-b border-line/60">
                <div>
                  <span className="font-semibold text-ink">{skillLabel}</span> · {worker.yearsExp}{' '}
                  {t.yrs} · {worker.area}
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-current" />
                  {Number(worker.ratingAvg).toFixed(1)} ({worker.jobsCount} {t.jobs})
                </div>
              </div>

              {/* About description */}
              <div>
                <h3 className="font-baloo text-base font-bold text-ink mb-1.5">{t.about}</h3>
                <p className="text-sm text-ink/80 leading-relaxed bg-bg p-3.5 rounded-xl border border-line">
                  {worker.about}
                </p>
              </div>

              {/* Work samples gallery */}
              <div>
                <h3 className="font-baloo text-base font-bold text-ink mb-2">{t.work}</h3>
                {worker.photos && worker.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {worker.photos.map((url: string, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setZoomedPhoto(url)}
                        className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-line bg-line/20 focus:outline-none focus:ring-2 focus:ring-blue cursor-zoom-in"
                        aria-label={`View enlarged photo ${i + 1}`}
                      >
                        <img
                          src={url}
                          alt={`Work sample ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-mute italic">No work photos uploaded yet.</p>
                )}
              </div>

              {/* Reviews */}
              <div>
                <h3 className="font-baloo text-base font-bold text-ink mb-2">{t.rev}</h3>
                <div className="space-y-2">
                  {worker.reviews && worker.reviews.length > 0 ? (
                    worker.reviews.map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-sm text-ink/80 p-3 rounded-xl border border-line/70 bg-card"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-amber-500 flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {r.rating || 5}.0
                          </span>
                          <span className="text-xs text-mute">
                            {r.customerName || (locale === 'mr' ? 'ग्राहक' : 'Customer')}
                          </span>
                        </div>
                        <p className="italic text-xs leading-normal">
                          &ldquo;{typeof r === 'string' ? r : r.text}&rdquo;
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-mute italic">No reviews yet.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const w = worker;
                    setActiveWorkerDialog(null);
                    setActiveBookingDialog(w);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  {t.book}
                </button>

                {user && worker.phone ? (
                  <a
                    href={`tel:${worker.phone}`}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm border border-ink/80 bg-card hover:bg-line/20 text-ink flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {t.call} ({worker.phone})
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleCall}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm border border-line bg-card hover:bg-line/20 text-ink flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {t.call}
                  </button>
                )}
              </div>

              {/* Prototype Note */}
              <p className="text-xs text-mute bg-bg p-3 rounded-xl border-l-4 border-yel">
                {t.sample}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
