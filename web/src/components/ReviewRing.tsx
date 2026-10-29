'use client';

import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const REVIEWS = [
  {
    text: 'Fixed the kitchen leak in 40 minutes. Fair price. Came on time and cleaned up after.',
    worker: 'Ramesh Pawar',
    skill: 'Plumber',
    area: 'Garkheda',
    rating: 5,
  },
  {
    text: 'Replaced old switchboards neatly. Very professional, tested everything before leaving.',
    worker: 'Sunil Gaikwad',
    skill: 'Electrician',
    area: 'Jalna Road',
    rating: 5,
  },
  {
    text: 'Repaired three doors perfectly. Excellent finishing, worth every rupee.',
    worker: 'Dattu Shinde',
    skill: 'Carpenter',
    area: 'Osmanpura',
    rating: 5,
  },
  {
    text: 'Clean edges, no paint mess on the floor. Gave great advice on weatherproof coats.',
    worker: 'Vikas More',
    skill: 'Painter',
    area: 'Beed Bypass',
    rating: 4.8,
  },
  {
    text: 'Bathroom tiles are completely level. Completely honest about sand and cement needed.',
    worker: 'Ganesh Jadhav',
    skill: 'Mason',
    area: 'Samarth Nagar',
    rating: 5,
  },
  {
    text: 'Our flat looked brand new after two days. Extremely polite and on time every day.',
    worker: 'Santosh Pawar',
    skill: 'Painter',
    area: 'Garkheda',
    rating: 5,
  },
];

export default function ReviewRing() {
  const [activeIndex, setActiveIndex] = useState(0);

  const prevReview = () => {
    setActiveIndex((prev) => (prev === 0 ? REVIEWS.length - 1 : prev - 1));
  };

  const nextReview = () => {
    setActiveIndex((prev) => (prev === REVIEWS.length - 1 ? 0 : prev + 1));
  };

  const current = REVIEWS[activeIndex];

  return (
    <section className="py-14 border-t border-line/60 overflow-hidden bg-bg/50">
      <div className="max-w-[1100px] mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 mb-2">
            <Star className="w-4 h-4 fill-current" />
            <span>4.8 / 5.0 Rated by Aurangabad Citizens</span>
          </div>
          <h2 className="font-baloo text-2xl sm:text-3xl font-extrabold text-ink">
            What Neighbors Say About KaamSetu Artisans
          </h2>
        </div>

        {/* 3D Review Card Box */}
        <div className="relative max-w-xl mx-auto">
          <div className="bg-card border border-line rounded-2xl p-6 sm:p-8 shadow-md relative">
            <Quote className="w-10 h-10 text-yel/30 absolute top-4 right-4 pointer-events-none" />

            <div className="flex items-center gap-1 text-amber-500 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>

            <p className="font-sans text-base sm:text-lg text-ink font-normal italic leading-relaxed mb-6">
              &ldquo;{current.text}&rdquo;
            </p>

            <div className="flex items-center justify-between border-t border-line/60 pt-4">
              <div>
                <h4 className="font-baloo text-base font-bold text-ink">{current.worker}</h4>
                <p className="text-xs text-mute">
                  {current.skill} · {current.area}
                </p>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevReview}
                  className="w-8 h-8 rounded-full border border-line bg-bg hover:bg-line/20 flex items-center justify-center text-ink transition-colors"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextReview}
                  className="w-8 h-8 rounded-full border border-line bg-bg hover:bg-line/20 flex items-center justify-center text-ink transition-colors"
                  aria-label="Next review"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
