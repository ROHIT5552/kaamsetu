import React from 'react';
import dynamic from 'next/dynamic';
import { getMessages } from 'next-intl/server';
import { fetchApi } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import SkillChips from '@/components/SkillChips';
import WorkerCard from '@/components/WorkerCard';
import CompareDialog from '@/components/CompareDialog';
import WhyBento from '@/components/WhyBento';
import Marquee from '@/components/Marquee';
import NumbersBand from '@/components/NumbersBand';
import ReviewRing from '@/components/ReviewRing';
import ClientPageWrapper from './ClientPageWrapper';

// Dynamic client-only 3D Hero Scene with SSR: false as required
const HeroScene = dynamic(() => import('@/components/HeroScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] md:h-[420px] flex items-center justify-center bg-card/10 rounded-2xl animate-pulse text-mute text-sm">
      Loading 3D Aurangabad Hub...
    </div>
  ),
});

interface PageProps {
  params: { locale: string };
  searchParams: {
    skill?: string;
    area?: string;
    avail?: string;
    maxRate?: string;
    q?: string;
    sort?: string;
  };
}

export default async function HomePage({ params: { locale }, searchParams }: PageProps) {
  const messages = (await getMessages()) as any;

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (searchParams.skill && searchParams.skill !== 'all') queryParams.set('skill', searchParams.skill);
  if (searchParams.area) queryParams.set('area', searchParams.area);
  if (searchParams.avail) queryParams.set('avail', searchParams.avail);
  if (searchParams.maxRate) queryParams.set('maxRate', searchParams.maxRate);
  if (searchParams.q) queryParams.set('q', searchParams.q);
  if (searchParams.sort) queryParams.set('sort', searchParams.sort);

  let initialWorkers: any[] = [];
  let statsData: any = undefined;

  try {
    const res = await fetchApi(`/api/workers?${queryParams.toString()}`);
    initialWorkers = res.workers || [];
    const statsRes = await fetchApi('/api/stats');
    statsData = statsRes.stats;
  } catch (err) {
    console.warn('Initial server fetch failed, client fallback engaged:', err);
  }

  return (
    <ClientPageWrapper
      locale={locale}
      initialWorkers={initialWorkers}
      initialFilters={{
        skill: searchParams.skill || 'all',
        area: searchParams.area || '',
        avail: searchParams.avail || '',
        maxRate: searchParams.maxRate || '',
        q: searchParams.q || '',
        sort: searchParams.sort || 'rt',
      }}
      messages={messages}
      statsData={statsData}
      HeroSceneComponent={<HeroScene />}
    />
  );
}
