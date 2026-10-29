'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { fetchApi } from '@/lib/api';
import { Briefcase, MapPin, CheckCircle, Clock, Navigation } from 'lucide-react';
import { TIME_SLOTS } from '@kaamsetu/shared';

export default function WorkerDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const { user, setUser, addToast } = useStore();

  const [bookings, setBookings] = useState<any[]>([]);
  const [availability, setAvailability] = useState<string>('today');
  const [ratePerDay, setRatePerDay] = useState<number>(700);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGpsBookingId, setActiveGpsBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApi('/api/auth/me')
      .then((res) => {
        if (!res.user || (res.user.role !== 'WORKER' && res.user.role !== 'ADMIN')) {
          router.push(`/${locale}/join`);
        } else {
          setUser(res.user);
          if (res.user.workerProfile) {
            setAvailability(res.user.workerProfile.availability);
            setRatePerDay(res.user.workerProfile.ratePerDay);
          }
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

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await fetchApi(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      addToast(`Status updated to ${status.replace(/_/g, ' ')}`, 'success');
      loadBookings();
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleUpdateAvailability = async (newAvail: string) => {
    if (!user?.workerProfile?.id) return;
    try {
      await fetchApi(`/api/workers/${user.workerProfile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: newAvail }),
      });
      setAvailability(newAvail);
      addToast('Availability updated successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update availability', 'error');
    }
  };

  // Live GPS simulation loop for worker
  useEffect(() => {
    if (!activeGpsBookingId) return;

    let step = 0;
    const interval = setInterval(async () => {
      step++;
      const baseLat = 19.8654;
      const baseLng = 75.3489;
      // Simulate moving closer
      const simulatedLat = baseLat + (step * 0.001);
      const simulatedLng = baseLng + (step * 0.001);

      try {
        await fetchApi(`/api/bookings/${activeGpsBookingId}/location`, {
          method: 'POST',
          body: JSON.stringify({ lat: simulatedLat, lng: simulatedLng }),
        });
      } catch (e) {}

      if (step >= 10) {
        clearInterval(interval);
        setActiveGpsBookingId(null);
        addToast('Arrived at customer location!', 'success');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeGpsBookingId, addToast]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-baloo text-3xl sm:text-4xl font-extrabold text-ink flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-yel" />
            <span>Worker Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-mute">
            Manage incoming customer requests, update availability, and transmit live GPS coordinates.
          </p>
        </div>

        {/* Quick Availability Setter */}
        <div className="bg-card border border-line p-3 rounded-2xl flex items-center gap-2 shadow-sm">
          <span className="text-xs font-semibold text-mute">Status:</span>
          {(['today', 'tomorrow', 'week'] as const).map((a) => (
            <button
              key={a}
              onClick={() => handleUpdateAvailability(a)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                availability === a
                  ? 'bg-ink text-white dark:bg-yel dark:text-yelink'
                  : 'bg-bg text-mute hover:text-ink'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Request List */}
      <div className="space-y-4">
        <h2 className="font-baloo text-xl font-bold text-ink">
          Incoming Job Requests ({bookings.length})
        </h2>

        {isLoading ? (
          <div className="py-12 text-center text-mute text-sm bg-card rounded-2xl border border-line animate-pulse">
            Loading incoming requests...
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-mute text-sm bg-card rounded-2xl border border-line p-6">
            <p>No active booking requests yet. They will appear here when customers book you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((b) => {
              const cust = b.customer;
              const dateStr = new Date(b.date).toISOString().slice(0, 10);
              const slotStr = TIME_SLOTS[b.slot]?.en || 'Slot';

              return (
                <div
                  key={b.id}
                  className="bg-card border border-line rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-baloo font-bold text-lg text-ink">
                        {cust?.name || 'Customer'}
                      </h3>
                      <p className="text-xs text-mute font-mono">
                        📞 {cust?.phone || 'Customer phone'}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue/30 bg-blue/10 text-blue">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="bg-bg p-3 rounded-xl border border-line text-xs font-medium space-y-1">
                    <p className="text-ink font-semibold">Job: &ldquo;{b.job}&rdquo;</p>
                    <p className="text-mute flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-yel" />
                      <span>{b.address}</span>
                    </p>
                    <p className="text-mute flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue" />
                      <span>{dateStr} · {slotStr}</span>
                    </p>
                  </div>

                  {/* Worker Action Buttons */}
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'ON_THE_WAY')}
                        className="px-3 py-1.5 rounded-lg font-bold bg-blue text-white hover:brightness-105"
                      >
                        Start Trip (On the Way)
                      </button>
                    )}

                    {b.status === 'ON_THE_WAY' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(b.id, 'ARRIVED')}
                          className="px-3 py-1.5 rounded-lg font-bold bg-yel text-yelink hover:brightness-105"
                        >
                          Mark Arrived
                        </button>
                        <button
                          onClick={() => setActiveGpsBookingId(b.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold border flex items-center gap-1 ${
                            activeGpsBookingId === b.id
                              ? 'bg-ok text-white border-ok animate-pulse'
                              : 'bg-bg text-ink border-line'
                          }`}
                        >
                          <Navigation className="w-3 h-3" />
                          {activeGpsBookingId === b.id ? 'Transmitting GPS...' : 'Transmit GPS'}
                        </button>
                      </>
                    )}

                    {b.status === 'ARRIVED' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'DONE')}
                        className="px-3 py-1.5 rounded-lg font-bold bg-ok text-white hover:brightness-105"
                      >
                        Mark Job Done (Collect Payment)
                      </button>
                    )}

                    {b.status !== 'DONE' && b.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                        className="px-3 py-1.5 rounded-lg font-medium text-bad hover:bg-bad/10 ml-auto"
                      >
                        Decline
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
