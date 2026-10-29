'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import SkillChips from '@/components/SkillChips';
import WorkerCard from '@/components/WorkerCard';
import CompareDialog from '@/components/CompareDialog';
import WhyBento from '@/components/WhyBento';
import Marquee from '@/components/Marquee';
import NumbersBand from '@/components/NumbersBand';
import ReviewRing from '@/components/ReviewRing';
import { useStore } from '@/store/useStore';
import dynamic from 'next/dynamic';
import { X, Navigation } from 'lucide-react';
import { fetchApi } from '@/lib/api';

// Dynamic TrackScene client component
const TrackScene = dynamic(() => import('@/components/TrackScene'), {
  ssr: false,
  loading: () => <div className="h-64 bg-card/20 animate-pulse rounded-xl" />,
});

interface ClientPageWrapperProps {
  locale: string;
  initialWorkers: any[];
  initialFilters: {
    skill: string;
    area: string;
    avail: string;
    maxRate: string;
    q: string;
    sort: string;
  };
  messages: any;
  statsData: any;
  HeroSceneComponent: React.ReactNode;
}

export default function ClientPageWrapper({
  locale,
  initialWorkers,
  initialFilters,
  messages: t,
  statsData,
  HeroSceneComponent,
}: ClientPageWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { activeTrackBooking, setActiveTrackBooking, setUser } = useStore();

  const [workers, setWorkers] = useState<any[]>(initialWorkers);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(false);

  // Check current session on mount
  useEffect(() => {
    fetchApi('/api/auth/me')
      .then((res) => {
        if (res.user) setUser(res.user);
      })
      .catch(() => {});
  }, [setUser]);

  // Sync filters to URL search params for SEO and shareability
  const updateUrlParams = (newFilters: typeof filters) => {
    const params = new URLSearchParams();
    if (newFilters.skill && newFilters.skill !== 'all') params.set('skill', newFilters.skill);
    if (newFilters.area) params.set('area', newFilters.area);
    if (newFilters.avail) params.set('avail', newFilters.avail);
    if (newFilters.maxRate) params.set('maxRate', newFilters.maxRate);
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.sort && newFilters.sort !== 'rt') params.set('sort', newFilters.sort);

    const query = params.toString();
    const newUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    updateUrlParams(updated);
  };

  const handleSelectSkill = (skill: string) => {
    handleFilterChange('skill', skill);
  };

  // Fetch filtered workers when filters change
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.skill && filters.skill !== 'all') params.set('skill', filters.skill);
    if (filters.area) params.set('area', filters.area);
    if (filters.avail) params.set('avail', filters.avail);
    if (filters.maxRate) params.set('maxRate', filters.maxRate);
    if (filters.q) params.set('q', filters.q);
    if (filters.sort) params.set('sort', filters.sort);

    fetchApi(`/api/workers?${params.toString()}`)
      .then((res) => {
        if (res.workers) setWorkers(res.workers);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [filters]);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-ink text-white pt-8 pb-12 relative overflow-hidden transition-colors">
        <div className="max-w-[1100px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h1 className="font-baloo text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
              {t.hT}
            </h1>
            <p className="font-sans text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
              {t.hS}
            </p>

            {/* Embedded Search Filter Box */}
            <div className="pt-2">
              <SearchBar
                filters={filters}
                onChange={handleFilterChange}
                t={{
                  area: t.area,
                  avail: t.avail,
                  max: t.max,
                  q: t.q,
                  all: t.all,
                  any: t.any,
                  today: t.today,
                  tomorrow: t.tomorrow,
                  week: t.week,
                }}
              />
            </div>
          </div>

          {/* 3D Isometric Hero City Scene */}
          <div className="lg:col-span-5 h-[340px] md:h-[400px] relative">
            {HeroSceneComponent}
          </div>
        </div>
      </section>

      {/* Striped Construction Tape Banner */}
      <div className="tape" role="presentation" />

      {/* Main Workers Showcase Area */}
      <section className="max-w-[1100px] mx-auto px-4 py-6">
        {/* Skill Category Chips */}
        <SkillChips
          locale={locale}
          selectedSkill={filters.skill}
          onSelectSkill={handleSelectSkill}
          allLabel={t.allS}
        />

        {/* Results Bar (Count & Sort) */}
        <div className="flex items-center justify-between flex-wrap gap-4 py-3 mb-2">
          <span className="text-sm font-medium text-mute">
            {isLoading ? 'Searching...' : `${workers.length} ${t.found}`}
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-xs font-semibold text-mute">
              Sort:
            </label>
            <select
              id="sort-select"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="bg-card border border-line rounded-lg px-3 py-1.5 text-xs font-medium text-ink focus:ring-2 focus:ring-blue"
            >
              <option value="rt">{t.sRate}</option>
              <option value="low">{t.sLow}</option>
              <option value="exp">{t.sExp}</option>
            </select>
          </div>
        </div>

        {/* Workers Grid */}
        {workers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {workers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                locale={locale}
                t={{
                  yrs: t.yrs,
                  jobs: t.jobs,
                  ver: t.ver,
                  unv: t.unv,
                  perDay: t.perDay,
                  visit: t.visit,
                  free: t.free,
                  view: t.view,
                  book: t.book,
                  call: t.call,
                  cmp: t.cmp,
                  today: t.today,
                  tomorrow: t.tomorrow,
                  week: t.week,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-line rounded-2xl p-6 text-mute">
            <p className="text-sm max-w-md mx-auto">{t.empty}</p>
          </div>
        )}
      </section>

      {/* Numbers Stats Band */}
      <NumbersBand
        initialStats={statsData}
        t={{
          statsWorkers: t.statsWorkers,
          statsJobs: t.statsJobs,
          statsAreas: t.statsAreas,
          statsRating: t.statsRating,
        }}
      />

      {/* Marquee Ticker */}
      <Marquee />

      {/* Why Bento Grid */}
      <WhyBento
        t={{
          whyTitle: t.whyTitle,
          why1Title: t.why1Title,
          why1Desc: t.why1Desc,
          why2Title: t.why2Title,
          why2Desc: t.why2Desc,
          why3Title: t.why3Title,
          why3Desc: t.why3Desc,
          why4Title: t.why4Title,
          why4Desc: t.why4Desc,
        }}
      />

      {/* 3D Customer Review Carousel */}
      <ReviewRing />

      {/* Compare Floating Bar and Modal */}
      <CompareDialog
        workers={workers}
        locale={locale}
        t={{
          cG: t.cG,
          cN: t.cN,
          clear: t.clear,
          rows: t.rows,
          book: t.book,
          yrs: t.yrs,
          today: t.today,
          tomorrow: t.tomorrow,
          week: t.week,
        }}
      />

      {/* Active Live Tracking Modal if opened */}
      {activeTrackBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card text-ink rounded-2xl max-w-xl w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-yel" />
                <h2 className="font-baloo text-xl font-bold">
                  {t.trk} · {activeTrackBooking.worker?.user?.name || 'Worker'}
                </h2>
              </div>
              <button
                onClick={() => setActiveTrackBooking(null)}
                className="text-mute hover:text-ink p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <TrackScene
                bookingId={activeTrackBooking.id}
                workerName={activeTrackBooking.worker?.user?.name || 'Worker'}
                skillKey={activeTrackBooking.worker?.skill || 'plumber'}
                area={activeTrackBooking.address || activeTrackBooking.worker?.area || 'Garkheda'}
              />
              <p className="text-xs text-mute bg-bg p-3 rounded-xl border-l-4 border-yel">
                {t.demo}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
