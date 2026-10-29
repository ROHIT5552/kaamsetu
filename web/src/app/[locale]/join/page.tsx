'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SKILLS_DATA, SKILL_KEYS, AREAS } from '@kaamsetu/shared';
import WorkerCard from '@/components/WorkerCard';
import { useStore } from '@/store/useStore';
import { fetchApi } from '@/lib/api';
import { CheckCircle2, Upload } from 'lucide-react';

export default function JoinWorkerPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();
  const { user, openAuthModal, addToast } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [skill, setSkill] = useState('plumber');
  const [yearsExp, setYearsExp] = useState(5);
  const [area, setArea] = useState('Garkheda');
  const [ratePerDay, setRatePerDay] = useState(700);
  const [phone, setPhone] = useState(user?.phone || '');
  const [about, setAbout] = useState('Professional plumbing, pipe repairs, and sanitary fittings in Aurangabad.');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Handle local photo preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 6);
    setSelectedFiles(files);

    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      addToast('Please sign in or verify your mobile number first', 'info');
      openAuthModal();
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      addToast('Enter a valid 10-digit Indian mobile number', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('skill', skill);
      formData.append('yearsExp', String(yearsExp));
      formData.append('area', area);
      formData.append('ratePerDay', String(ratePerDay));
      formData.append('phone', phone.trim());
      formData.append('about', about.trim() || 'New on KaamSetu. Verification pending.');

      selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });

      await fetchApi('/api/workers', {
        method: 'POST',
        body: formData,
      });

      setIsSubmitted(true);
      addToast(t('jOk'), 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to submit worker profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock object for the Live Worker Card Preview
  const livePreviewWorker = {
    id: 'preview-id',
    name: name.trim() || 'Your Full Name',
    skill,
    yearsExp,
    area,
    ratePerDay,
    visitCharge: 0,
    ratingAvg: 4.0,
    jobsCount: 0,
    availability: 'week',
    verified: false,
    about: about || 'New on KaamSetu. Verification pending.',
    phone: phone || '9000000000',
    photos: previewUrls.length > 0 ? previewUrls : [
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80',
    ],
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink mb-2">
          {t('jT')}
        </h1>
        <p className="text-sm sm:text-base text-mute max-w-xl">
          {t('jS')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-card border border-line rounded-2xl p-6 sm:p-8 shadow-sm">
          {isSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-ok/10 text-ok rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="font-baloo text-2xl font-bold text-ink">
                Registration Submitted!
              </h2>
              <p className="text-sm text-mute max-w-md mx-auto leading-relaxed">
                {t('jOk')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-mute mb-1">{t('jN')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dattu Shinde"
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-mute mb-1">{t('jSk')}</label>
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                  >
                    {SKILL_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {SKILLS_DATA[k].emoji} {locale === 'mr' ? SKILLS_DATA[k].mr : SKILLS_DATA[k].en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mute mb-1">{t('jE')}</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={yearsExp}
                    onChange={(e) => setYearsExp(Number(e.target.value))}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-mute mb-1">{t('jA')}</label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mute mb-1">{t('jR')}</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={ratePerDay}
                    onChange={(e) => setRatePerDay(Number(e.target.value))}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">{t('jP')}</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-line bg-bg text-xs font-semibold text-mute">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-bg border border-line rounded-r-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  About your craftsmanship & services
                </label>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="e.g. Doors, locks, bathroom fittings, waterproofing and furniture repairs..."
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">{t('jPh')}</label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-line rounded-xl hover:border-yel/80 transition-colors cursor-pointer bg-bg">
                  <Upload className="w-6 h-6 text-mute mb-1" />
                  <span className="text-xs font-medium text-ink">Click to upload photos (Max 6, 5MB each)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting Application...' : t('jB')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live Preview Card Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card border border-line rounded-2xl p-4 shadow-sm">
            <h3 className="font-baloo text-base font-bold text-ink mb-1">
              Live Card Preview
            </h3>
            <p className="text-xs text-mute mb-3">
              This is how your profile card will be displayed to customers across Aurangabad.
            </p>
            <WorkerCard
              worker={livePreviewWorker}
              locale={locale}
              t={{
                yrs: t('yrs'),
                jobs: t('jobs'),
                ver: t('ver'),
                unv: t('unv'),
                perDay: t('perDay'),
                visit: t('visit'),
                free: t('free'),
                view: t('view'),
                book: t('book'),
                call: t('call'),
                cmp: t('cmp'),
                today: t('today'),
                tomorrow: t('tomorrow'),
                week: t('week'),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
