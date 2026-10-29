'use client';

import React from 'react';
import { SKILLS_DATA, SKILL_KEYS } from '@kaamsetu/shared';

interface SkillChipsProps {
  locale: string;
  selectedSkill: string;
  onSelectSkill: (skill: string) => void;
  allLabel: string;
}

export default function SkillChips({
  locale,
  selectedSkill,
  onSelectSkill,
  allLabel,
}: SkillChipsProps) {
  const isAll = !selectedSkill || selectedSkill === 'all';

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none"
      role="tablist"
      aria-label="Skill categories filter"
    >
      <button
        type="button"
        role="tab"
        aria-selected={isAll}
        onClick={() => onSelectSkill('all')}
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
          isAll
            ? 'bg-ink text-white border-ink dark:bg-yel dark:text-yelink dark:border-yel shadow-sm'
            : 'bg-card text-ink/80 border-line hover:border-mute/50'
        }`}
      >
        {allLabel}
      </button>

      {SKILL_KEYS.map((key) => {
        const item = SKILLS_DATA[key];
        const isSelected = selectedSkill === key;
        const label = locale === 'mr' ? item.mr : item.en;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectSkill(key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-1.5 ${
              isSelected
                ? 'bg-ink text-white border-ink dark:bg-yel dark:text-yelink dark:border-yel shadow-sm'
                : 'bg-card text-ink/80 border-line hover:border-mute/50'
            }`}
          >
            <span>{item.emoji}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
