'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { fetchApi } from '@/lib/api';
import { TIME_SLOTS } from '@kaamsetu/shared';
import { Calendar, Navigation, Star, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import TrackScene from '@/components/TrackScene';

export default function AccountPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const { user, setUser, addToast } = useStore();

  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingBooking, setTrackingBooking] = useState<any | null>(null);

  // Review submission state
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    fetchApi('/api/auth/me')
      .then((res) => {
        if (!res.user) {
          router.push(`/${locale}/login`);
        } else {
          setUser(res.user);
          loadBookings();
        }
      })
      .catch(() => {
        router.push(`/${locale}/login`);
      });
  }, [locale, router, setUser]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/bookings/mine');
      setBookings(res.bookings || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking request?')) return;
    try {
      await fetchApi(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      addToast('Booking cancelled successfully', 'info');
      loadBookings();
    } catch (err: any) {
      addToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent, workerId: string) => {
    e.preventDefault();
    if (reviewText.trim().length < 3) {
      addToast('Please write a brief review', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await fetchApi('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          workerId,
          bookingId: reviewBookingId,
          rating: reviewRating,
          text: reviewText.trim(),
        }),
      });
      addToast('Thank you for your review!', 'success');
      setReviewBookingId(null);
      setReviewText('');
      loadBookings();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink">
            My Account & Bookings
          </h1>
          <p className="text-xs sm:text-sm text-mute">
            Track your artisan arrivals, manage bookings, and leave reviews.
          </p>
        </div>

        {user && (
          <div className="bg-card border border-line px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-yel text-yelink font-bold flex items-center justify-center font-baloo">
              {user.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-sm text-ink">{user.name}</div>
              <div className="text-xs text-mute font-mono">{user.phone || user.email}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bookings Section */}
      <div className="space-y-4">
        <h2 className="font-baloo text-xl font-bold text-ink flex items-center gap-2">
          <Calendar className="w-5 h-5 text-yel" />
          <span>Your Bookings</span>
        </h2>

        {isLoading ? (
          <div className="py-12 text-center text-mute text-sm bg-card rounded-2xl border border-line animate-pulse">
            Loading your bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-mute text-sm bg-card rounded-2xl border border-line p-6">
            <p className="max-w-xs mx-auto mb-3">
              You haven&apos;t made any booking requests yet.
            </p>
            <button
              onClick={() => router.push(`/${locale}`)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-yel text-yelink"
            >
              Browse Skilled Workers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((b) => {
              const worker = b.worker;
              const dateStr = new Date(b.date).toISOString().slice(0, 10);
              const slotStr = TIME_SLOTS[b.slot]?.en || 'Slot';

              const isDone = b.status === 'DONE';
              const isCancelled = b.status === 'CANCELLED';
              const canTrack = ['CONFIRMED', 'ON_THE_WAY', 'ARRIVED'].includes(b.status);

              return (
                <div
                  key={b.id}
                  className="bg-card border border-line rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-baloo font-bold text-lg text-ink">
                          {worker?.user?.name || 'Artisan'}
                        </h3>
                        <p className="text-xs text-mute capitalize">
                          {worker?.skill} · {b.address || worker?.area}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          b.status === 'DONE'
                            ? 'text-ok bg-ok/10 border-ok/30'
                            : b.status === 'CANCELLED'
                            ? 'text-bad bg-bad/10 border-bad/30'
                            : 'text-blue bg-blue/10 border-blue/30'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-ink/80 bg-bg p-2.5 rounded-lg border border-line font-medium mb-3">
                      &ldquo;{b.job}&rdquo;
                    </p>

                    <div className="text-xs text-mute flex items-center justify-between">
                      <span>Date: <b className="text-ink">{dateStr}</b></span>
                      <span>Slot: <b className="text-ink">{slotStr}</b></span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                    {canTrack && (
                      <button
                        type="button"
                        onClick={() => setTrackingBooking(b)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yel text-yelink hover:brightness-105 flex items-center gap-1.5 shadow-sm"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Live Track
                      </button>
                    )}

                    {isDone && (
                      <button
                        type="button"
                        onClick={() => setReviewBookingId(b.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-ok text-white hover:brightness-105 flex items-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        Leave Review
                      </button>
                    )}

                    {!isDone && !isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(b.id)}
                        className="text-xs font-medium text-bad hover:underline ml-auto"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Tracking Modal */}
      {trackingBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card text-ink rounded-2xl max-w-xl w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-yel" />
                <h3 className="font-baloo text-xl font-bold">
                  Tracking {trackingBooking.worker?.user?.name || 'Worker'}
                </h3>
              </div>
              <button
                onClick={() => setTrackingBooking(null)}
                className="text-mute hover:text-ink p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <TrackScene
                bookingId={trackingBooking.id}
                workerName={trackingBooking.worker?.user?.name || 'Worker'}
                skillKey={trackingBooking.worker?.skill || 'plumber'}
                area={trackingBooking.address || 'Garkheda'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewBookingId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card text-ink rounded-2xl max-w-md w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="font-baloo text-lg font-bold">Rate & Review Work</h3>
              <button
                onClick={() => setReviewBookingId(null)}
                className="text-mute hover:text-ink p-1"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                const b = bookings.find((item) => item.id === reviewBookingId);
                if (b) handleSubmitReview(e, b.workerId);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-mute mb-1">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-1.5 rounded-lg ${
                        reviewRating >= star ? 'text-amber-500' : 'text-mute/40'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  Your Review / Experience
                </label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="e.g. Fixed the leak on time, fair daily rate..."
                  required
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md disabled:opacity-60"
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
