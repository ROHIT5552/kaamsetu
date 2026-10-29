'use client';

import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, MapPin, Star } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface NumbersBandProps {
  initialStats?: {
    workers: number;
    jobsCompleted: number;
    areasCount: number;
    averageRating: number;
  };
  t: {
    statsWorkers: string;
    statsJobs: string;
    statsAreas: string;
    statsRating: string;
  };
}

export default function NumbersBand({ initialStats, t }: NumbersBandProps) {
  const [stats, setStats] = useState(
    initialStats || {
      workers: 500,
      jobsCompleted: 1450,
      areasCount: 8,
      averageRating: 4.8,
    }
  );

  useEffect(() => {
    fetchApi('/api/stats')
      .then((res) => {
        if (res.stats) setStats(res.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full bg-card border-y border-line py-8 transition-colors">
      <div className="max-w-[1100px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {/* Workers */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-blue mb-1">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink">
            {stats.workers}+
          </div>
          <p className="text-xs text-mute font-medium">{t.statsWorkers}</p>
        </div>

        {/* Jobs Completed */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-ok mb-1">
            <CheckCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink">
            {stats.jobsCompleted}+
          </div>
          <p className="text-xs text-mute font-medium">{t.statsJobs}</p>
        </div>

        {/* Localities */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-yelink dark:text-yel mb-1">
            <MapPin className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink">
            {stats.areasCount}
          </div>
          <p className="text-xs text-mute font-medium">{t.statsAreas}</p>
        </div>

        {/* Rating */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink">
            {stats.averageRating}★
          </div>
          <p className="text-xs text-mute font-medium">{t.statsRating}</p>
        </div>
      </div>
    </div>
  );
}
