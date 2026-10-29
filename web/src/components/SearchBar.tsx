'use client';

import React from 'react';
import { AREAS } from '@kaamsetu/shared';
import { Search } from 'lucide-react';

interface SearchBarProps {
  filters: {
    area: string;
    avail: string;
    maxRate: string;
    q: string;
  };
  onChange: (key: string, value: string) => void;
  t: {
    area: string;
    avail: string;
    max: string;
    q: string;
    all: string;
    any: string;
    today: string;
    tomorrow: string;
    week: string;
  };
}

export default function SearchBar({ filters, onChange, t }: SearchBarProps) {
  return (
    <div className="bg-card text-ink rounded-xl p-3 shadow-sm border border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-[940px] transition-colors">
      {/* Area Filter */}
      <div>
        <label htmlFor="filter-area" className="block text-xs font-medium text-mute mb-1">
          {t.area}
        </label>
        <select
          id="filter-area"
          value={filters.area}
          onChange={(e) => onChange('area', e.target.value)}
          className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue"
        >
          <option value="">{t.all}</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Availability Filter */}
      <div>
        <label htmlFor="filter-avail" className="block text-xs font-medium text-mute mb-1">
          {t.avail}
        </label>
        <select
          id="filter-avail"
          value={filters.avail}
          onChange={(e) => onChange('avail', e.target.value)}
          className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue"
        >
          <option value="">{t.any}</option>
          <option value="today">{t.today}</option>
          <option value="tomorrow">{t.tomorrow}</option>
          <option value="week">{t.week}</option>
        </select>
      </div>

      {/* Max Daily Rate */}
      <div>
        <label htmlFor="filter-max" className="block text-xs font-medium text-mute mb-1">
          {t.max}
        </label>
        <div className="relative">
          <input
            id="filter-max"
            type="number"
            min="0"
            step="50"
            placeholder="₹ Any"
            value={filters.maxRate}
            onChange={(e) => onChange('maxRate', e.target.value)}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue placeholder:text-mute/60"
          />
        </div>
      </div>

      {/* Search Query */}
      <div>
        <label htmlFor="filter-q" className="block text-xs font-medium text-mute mb-1">
          {t.q}
        </label>
        <div className="relative">
          <input
            id="filter-q"
            type="search"
            placeholder="Name, work, specialty..."
            value={filters.q}
            onChange={(e) => onChange('q', e.target.value)}
            className="w-full bg-bg border border-line rounded-lg pl-8 pr-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue placeholder:text-mute/60"
          />
          <Search className="w-4 h-4 text-mute absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
