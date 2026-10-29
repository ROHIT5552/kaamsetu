'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, Navigation, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { fetchApi } from '@/lib/api';

interface BookingDialogProps {
  locale: string;
  t: {
    bT: string;
    bDate: string;
    bSlot: string;
    bName: string;
    bPhone: string;
    bJob: string;
    bSend: string;
    bOk: string;
    slots: string[];
    trk: string;
  };
}

export default function BookingDialog({ locale, t }: BookingDialogProps) {
  const {
    activeBookingDialog: worker,
    setActiveBookingDialog,
    setActiveTrackBooking,
    user,
    addToast,
  } = useStore();

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [slot, setSlot] = useState(0);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [job, setJob] = useState('');
  const [address, setAddress] = useState(worker?.area || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<any | null>(null);

  if (!worker) return null;

  const minDate = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[6-9]\d{9}$/.test(phone)) {
      addToast('Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }

    if (job.trim().length < 3) {
      addToast('Please describe the work that needs to be done.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchApi('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          workerId: worker.id,
          date,
          slot,
          job: job.trim(),
          name: name.trim() || `Customer-${phone.slice(-4)}`,
          phone: phone.trim(),
          address: address.trim() || worker.area,
        }),
      });

      // Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffc21a', '#1d4e89', '#17794f', '#14232b'],
      });

      setCompletedBooking(response.booking);
      addToast(t.bOk, 'success');
    } catch (err: any) {
      addToast(err.message || 'Booking failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTracking = () => {
    const b = completedBooking;
    setActiveBookingDialog(null);
    setActiveTrackBooking(b);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-dialog-title"
    >
      <div className="bg-card text-ink rounded-2xl max-w-lg w-full border border-line shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 id="booking-dialog-title" className="font-baloo text-xl font-bold">
            {t.bT} – {worker.name}
          </h2>
          <button
            onClick={() => {
              setCompletedBooking(null);
              setActiveBookingDialog(null);
            }}
            className="text-mute hover:text-ink p-1 rounded-lg"
            aria-label="Close booking form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {completedBooking ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-ok/10 text-ok rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-baloo text-xl font-bold text-ink">
                Booking Request Sent!
              </h3>
              <p className="text-sm text-mute max-w-xs mx-auto">
                {t.bOk}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenTracking}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-yel text-yelink hover:brightness-105 shadow-md inline-flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  {t.trk}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-mute mb-1">
                    {t.bDate}
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mute mb-1">
                    {t.bSlot}
                  </label>
                  <select
                    value={slot}
                    onChange={(e) => setSlot(Number(e.target.value))}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                  >
                    {t.slots.map((s, i) => (
                      <option key={i} value={i}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  {t.bName}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  {t.bPhone}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  required
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  Address / Locality (Aurangabad)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Green Valley, Garkheda"
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-mute mb-1">
                  {t.bJob}
                </label>
                <textarea
                  rows={3}
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="Describe the issue or work required (e.g. bathroom pipe leaking under basin)..."
                  required
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-blue resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl font-bold text-sm bg-yel text-yelink hover:brightness-105 shadow-md transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Sending Request...' : t.bSend}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
