"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  SKILLS,
  LOCALITIES,
  DIAGNOSTIC_ISSUES,
  INITIAL_WORKERS,
  I18N,
  INITIAL_BOOKINGS,
} from "../lib/kaamsetu-data";
import Toaster from "../components/Toaster";
import { ToastNotification, ToastType, WorkerProfile, BookingRecord, LedgerItem } from "../utils";

// React Error Boundary for isolated modal/widget protection
class SafeBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Recovered from component error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center my-4">
          <p className="text-xs text-amber-900 font-bold">⚠️ Component Notice</p>
          <p className="text-[11px] text-slate-600 mt-1">This section encountered an issue. Click below to reload.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
          >
            Reload Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LiveTrackingModal({ booking, onClose, onOpenReview, onOpenPayment, t, lang }: any) {
      const [progress, setProgress] = useState(0.2); // 0.0 to 1.0

      // Coordinate Waypoints along realistic city road network
      const waypoints = [
        [35, 185],
        [80, 180],
        [110, 140],
        [160, 140],
        [190, 80],
        [220, 80],
        [255, 35]
      ];

      useEffect(() => {
        const interval = setInterval(() => {
          setProgress(prev => (prev >= 1 ? 1 : prev + 0.04));
        }, 800);
        return () => clearInterval(interval);
      }, []);

      // Calculate current marker position along polyline
      const getPosition = (p) => {
        const totalSegments = waypoints.length - 1;
        const targetIndex = Math.min(Math.floor(p * totalSegments), totalSegments - 1);
        const segmentProgress = (p * totalSegments) - targetIndex;

        const p1 = waypoints[targetIndex];
        const p2 = waypoints[targetIndex + 1];

        const x = p1[0] + (p2[0] - p1[0]) * segmentProgress;
        const y = p1[1] + (p2[1] - p1[1]) * segmentProgress;
        return { x, y };
      };

      const currentPos = getPosition(progress);
      const remainingMins = Math.max(1, Math.ceil(14 * (1 - progress)));
      const remainingKm = Math.max(0.1, (2.8 * (1 - progress))).toFixed(1);

      return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display font-bold text-lg">{t.liveTrackingTitle}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {booking.workerName} ({booking.workerSkill})
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
            </div>

            {/* SVG Map Canvas */}
            <div className="p-5">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-inner">
                <svg viewBox="0 0 300 210" className="w-full h-56 block">
                  {/* City Background Roads Grid */}
                  <g stroke="#cbd5e1" strokeWidth="8" className="dark:stroke-slate-800">
                    <line x1="10" y1="50" x2="290" y2="50" />
                    <line x1="10" y1="120" x2="290" y2="120" />
                    <line x1="10" y1="180" x2="290" y2="180" />
                    <line x1="60" y1="10" x2="60" y2="200" />
                    <line x1="140" y1="10" x2="140" y2="200" />
                    <line x1="220" y1="10" x2="220" y2="200" />
                  </g>

                  {/* Active Polyline Route */}
                  <polyline
                    points={waypoints.map(w => w.join(",")).join(" ")}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="5"
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                  />

                  {/* Destination Home Marker */}
                  <g transform="translate(255, 35)">
                    <circle r="16" fill="#f59e0b" className="animate-ping opacity-40" />
                    <circle r="14" fill="#ffc21a" />
                    <text textAnchor="middle" y="5" fontSize="13">🏠</text>
                  </g>

                  {/* Worker Live Moving Marker */}
                  <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
                    <circle r="16" fill="#3b82f6" className="animate-ping opacity-50" />
                    <circle r="14" fill="#1d4ed8" />
                    <text textAnchor="middle" y="5" fontSize="13">
                      {SKILLS[booking.workerSkill]?.icon || "🔧"}
                    </text>
                  </g>
                </svg>

                {/* Overlaid ETA pill */}
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{t.etaBadge}</div>
                  <div className="font-display font-extrabold text-base text-amber-500">
                    {progress >= 1 ? "Arrived at Doorstep" : `${remainingMins} ${t.minutes} (${remainingKm} km ${t.milesAway})`}
                  </div>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2 rounded-xl border font-semibold ${progress >= 0.1 ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  ✓ {t.step1}
                </div>
                <div className={`p-2 rounded-xl border font-semibold ${progress < 1 && progress > 0.1 ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  🚚 {t.step2}
                </div>
                <div className={`p-2 rounded-xl border font-semibold ${progress >= 1 ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  📍 {t.step3}
                </div>
              </div>

              {/* Direct Call, UPI Payment & Review Buttons */}
              <div className="mt-5 space-y-2">
                <div className="flex gap-2">
                  <a
                    href={`tel:${booking.workerPhone}`}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md text-center transition-colors"
                  >
                    📞 {t.callWorker} ({booking.workerPhone})
                  </a>
                </div>

                {progress >= 1 && (
                  <div className="space-y-2 pt-1">
                    {onOpenPayment && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPayment(booking);
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        💳 {t.payUpiBtn}
                      </button>
                    )}

                    {onOpenReview && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenReview({ id: booking.workerId, name: booking.workerName, skill: booking.workerSkill }, booking.id, booking.customerName);
                        }}
                        className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        ★ Job Done? Leave Review for {booking.workerName}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      );
    }

export default function KaamSetuApp() {
      // Preferences
      const [lang, setLang] = useState("en");
      const t = I18N[lang] || I18N.en;
      const [darkMode, setDarkMode] = useState(false);
      const [mounted, setMounted] = useState(false);

      // Navigation View: 'find' | 'emergency' | 'bookings' | 'join' | 'admin'
      const [activeTab, setActiveTab] = useState("find");

      // App Data State
      const [workers, setWorkers] = useState<any[]>(INITIAL_WORKERS as any[]);
      const [bookings, setBookings] = useState<any[]>(INITIAL_BOOKINGS as any[]);

      // Payout Ledger State
      const [commissionRate, setCommissionRate] = useState(5);
      const [payouts, setPayouts] = useState({
        101: {
          settledAmt: 4200,
          lastPayoutDate: "28/10/2026",
          lastTxRef: "UPI-SETTLE-88124",
          history: [
            { date: "28/10/2026", amount: 4200, txRef: "UPI-SETTLE-88124", mode: "Instant UPI Transfer" }
          ]
        },
        102: {
          settledAmt: 2450,
          lastPayoutDate: "27/10/2026",
          lastTxRef: "IMPS-PAY-44319",
          history: [
            { date: "27/10/2026", amount: 2450, txRef: "IMPS-PAY-44319", mode: "IMPS Bank Transfer" }
          ]
        }
      });
      const [payoutSearch, setPayoutSearch] = useState("");
      const [payoutFilter, setPayoutFilter] = useState("all");
      const [selectedLedgerWorker, setSelectedLedgerWorker] = useState<any>(null);

      // Filter States
      const [selectedSkill, setSelectedSkill] = useState("all");
      const [selectedArea, setSelectedArea] = useState("all");
      const [selectedAvail, setSelectedAvail] = useState("all");
      const [maxPrice, setMaxPrice] = useState("");
      const [searchQuery, setSearchQuery] = useState("");
      const [sortBy, setSortBy] = useState("rating");

      // Saved Favorites State
      const [favorites, setFavorites] = useState<number[]>([101, 102]);
      const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

      useEffect(() => {
        localStorage.setItem("ks_favorites", JSON.stringify(favorites));
      }, [favorites]);

      const handleToggleFavorite = (workerId, e) => {
        if (e) e.stopPropagation();
        setFavorites(prev => {
          const isFav = prev.includes(workerId);
          const next = isFav ? prev.filter(id => id !== workerId) : [...prev, workerId];
          showToast(isFav ? t.favoriteRemovedToast : t.favoriteAddedToast, isFav ? "info" : "success", isFav ? "Favorites Updated" : "Added to Saved Pros");
          return next;
        });
      };

      // Voice Audio Reader State (Web Speech API)
      const [speakingWorkerId, setSpeakingWorkerId] = useState(null);

      const handleToggleVoice = (w, e) => {
        if (e) e.stopPropagation();
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          showToast(t.audioSpeechError);
          return;
        }

        if (window.speechSynthesis.speaking && speakingWorkerId === w.id) {
          window.speechSynthesis.cancel();
          setSpeakingWorkerId(null);
          return;
        }

        window.speechSynthesis.cancel();

        const skillLabel = lang === "mr" ? (SKILLS[w.skill]?.mr || w.skill) : (SKILLS[w.skill]?.en || w.skill);
        const text = lang === "mr"
          ? `हे आहेत ${w.nameMr || w.name}. कौशल्य: ${skillLabel}. अनुभव: ${w.exp} वर्षे. परिसर: ${w.area}. तपासणी फी: ${w.visit} रुपये. प्रति तास दर: ${w.rate} रुपये. रेटिंग: ${w.rating} स्टार.`
          : `This is ${w.name}, ${skillLabel} with ${w.exp} years of experience in ${w.area}. Visiting fee is ${w.visit} rupees, hourly rate is ${w.rate} rupees, rated ${w.rating} stars.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (lang === "mr") {
          const mrVoice = voices.find(v => v.lang.startsWith("mr") || v.lang.startsWith("hi"));
          if (mrVoice) utterance.voice = mrVoice;
        } else {
          const enVoice = voices.find(v => v.lang === "en-IN" || v.lang.startsWith("en"));
          if (enVoice) utterance.voice = enVoice;
        }

        utterance.onstart = () => setSpeakingWorkerId(w.id);
        utterance.onend = () => setSpeakingWorkerId(null);
        utterance.onerror = () => setSpeakingWorkerId(null);

        window.speechSynthesis.speak(utterance);
      };

      // Smart Diagnostic & Cost Estimator State
      const [showEstimatorModal, setShowEstimatorModal] = useState(false);
      const [estimatorTrade, setEstimatorTrade] = useState("plumber");
      const [selectedIssueIndex, setSelectedIssueIndex] = useState(0);
      const [estimatorUrgency, setEstimatorUrgency] = useState("normal"); // 'normal' | 'emergency'
      const [estimatorLocality, setEstimatorLocality] = useState("Garkheda");

      // Admin Tab Internal State: 'workers' | 'bookings' | 'analytics'
      const [adminSubTab, setAdminSubTab] = useState("workers");
      const [adminBookingFilter, setAdminBookingFilter] = useState("all");
      const [adminSearch, setAdminSearch] = useState("");

      // Interactive Modals State
      const [compareList, setCompareList] = useState<number[]>([]);
      const [showCompareModal, setShowCompareModal] = useState(false);
      const [detailWorker, setDetailWorker] = useState<any>(null);
      const [bookingWorker, setBookingWorker] = useState<any>(null);
      const [trackingBooking, setTrackingBooking] = useState<any>(null);
      const [chatWorker, setChatWorker] = useState<any>(null);
      const [chatMessages, setChatMessages] = useState<Record<string | number, any[]>>({});
      const [currentChatInput, setCurrentChatInput] = useState("");
      const [toasts, setToasts] = useState<ToastNotification[]>([]);

      // PWA Installation State
      const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
      const [showInstallModal, setShowInstallModal] = useState(false);
      const [isAppInstalled, setIsAppInstalled] = useState(false);

      useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any)?.standalone)) {
          setIsAppInstalled(true);
        }

        const handlePrompt = (e) => {
          e.preventDefault();
          setDeferredInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', () => {
          setIsAppInstalled(true);
          setDeferredInstallPrompt(null);
          showToast(lang === 'en' ? '🎉 KaamSetu app installed to Home Screen!' : '🎉 कामसेतू अ‍ॅप होम स्क्रीनवर इन्स्टॉल झाले!');
        });

        return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
      }, [lang]);

      const handleTriggerInstall = () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.then((res) => {
            if (res.outcome === 'accepted') {
              showToast(lang === 'en' ? 'Installing KaamSetu...' : 'कामसेतू अ‍ॅप इन्स्टॉल होत आहे...');
            }
            setDeferredInstallPrompt(null);
          });
        } else {
          setShowInstallModal(true);
        }
      };

      // Review & Rating State
      const [reviewTarget, setReviewTarget] = useState<any>(null); // { worker, bookingId }
      const [ratingStars, setRatingStars] = useState(5);
      const [reviewComment, setReviewComment] = useState("");
      const [reviewerName, setReviewerName] = useState("");
      const [hoverRating, setHoverRating] = useState(0);

      const handleOpenReview = (worker, bookingId = null, custName = "") => {
        setReviewTarget({ worker, bookingId });
        setRatingStars(5);
        setHoverRating(0);
        setReviewComment("");
        setReviewerName(custName || "");
      };

      const handleSubmitReview = (e) => {
        e.preventDefault();
        if (!reviewTarget || !reviewerName.trim()) return;

        const targetWorkerId = reviewTarget.worker.id;
        const newReview = {
          user: reviewerName.trim(),
          text: reviewComment.trim() || "Punctual, professional and great quality work.",
          rating: ratingStars,
          date: "Just now"
        };

        setWorkers(prev => prev.map(w => {
          if (w.id === targetWorkerId) {
            const currentJobs = w.jobs || 0;
            const currentRating = w.rating || 4.5;
            const updatedRating = Number((((currentRating * currentJobs) + ratingStars) / (currentJobs + 1)).toFixed(1));
            return {
              ...w,
              rating: updatedRating,
              jobs: currentJobs + 1,
              reviews: [newReview, ...(w.reviews || [])]
            };
          }
          return w;
        }));

        if (reviewTarget.bookingId) {
          setBookings(prev => prev.map(b => b.id === reviewTarget.bookingId ? { ...b, reviewed: true, userRating: ratingStars } : b));
        }

        showToast(t.reviewSuccess, "success", "Review & Rating Published");
        setReviewTarget(null);
      };

      // Duty Switch Modal & State
      const [showDutyModal, setShowDutyModal] = useState(false);
      const [selectedDutyWorkerId, setSelectedDutyWorkerId] = useState(() => workers[0]?.id || 101);

      const handleUpdateWorkerDuty = (workerId, newAvail) => {
        setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, avail: newAvail } : w));
        const statusLabel = newAvail === "now" ? t.dutyOnline : newAvail === "busy" ? t.dutyBusy : t.dutyOffline;
        showToast(`${t.dutyUpdatedToast} ${statusLabel}`, "info", "Duty Status Changed");
      };

      // UPI Payment & Digital Tax Invoice State
      const [paymentBooking, setPaymentBooking] = useState<any>(null);

      const handleMarkPaid = (bookingId) => {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "paid", paidAt: new Date().toLocaleTimeString() } : b));
        if (paymentBooking && paymentBooking.id === bookingId) {
          setPaymentBooking(prev => ({ ...prev, status: "paid", paidAt: new Date().toLocaleTimeString() }));
        }
        showToast(t.paymentSuccessfulToast, "success", "Payment Marked as Paid");
      };

      // WhatsApp Link Generators
      const getWhatsAppOrderUrl = (b) => {
        const text = lang === "mr"
          ? `*कामसेतू सेवा बुकिंग स्लिप (#${b.id})*\n\nनमस्ते ${b.workerName},\nमी ${b.customerName} आहे. कामसेतू अ‍ॅपवरून तुमच्यासाठी काम बुक केले आहे:\n\n📍 *पत्ता:* ${b.customerAddress}\n📅 *दिनांक व वेळ:* ${b.date} (${b.slot})\n🔧 *कामाचे स्वरूप:* ${b.jobNote || "दुरुस्ती व देखभाल"}\n💰 *अंदाजे शुल्क:* ₹${b.estimatedAmt || 550}\n\nकृपया या मेसेजला होकार देऊन वेळ कन्फर्म करा!`
          : `*KaamSetu Work Order Slip (#${b.id})*\n\nHello ${b.workerName},\nI am ${b.customerName}. I have booked your service on KaamSetu:\n\n📍 *Address:* ${b.customerAddress}\n📅 *Date & Slot:* ${b.date} (${b.slot})\n🔧 *Task Details:* ${b.jobNote || "General Repair Work"}\n💰 *Est. Amount:* ₹${b.estimatedAmt || 550}\n\nPlease reply to this message to confirm your arrival time!`;
        return `https://wa.me/91${b.workerPhone}?text=${encodeURIComponent(text)}`;
      };

      const getWorkerInquiryWhatsAppUrl = (w) => {
        const text = lang === "mr"
          ? `नमस्ते ${w.nameMr || w.name}, मी कामसेतू (छत्रपती संभाजीनगर) वर तुमचे प्रोफाईल पाहिले. मला ${SKILLS[w.skill]?.mr || w.skill} कामासाठी चौकशी करायची आहे. तुम्ही उपलब्ध आहात का?`
          : `Hello ${w.name}, I found your profile on KaamSetu (Chhatrapati Sambhajinagar). I would like to inquire about ${SKILLS[w.skill]?.en || w.skill} service. Are you available?`;
        return `https://wa.me/91${w.phone}?text=${encodeURIComponent(text)}`;
      };

      // Translations helper (initialized at top of component)

      // Hydration & Storage Sync (SSR Safe)
      useEffect(() => {
        setMounted(true);
        try {
          if (typeof window !== "undefined") {
            const savedLang = localStorage.getItem("ks_lang");
            if (savedLang) setLang(savedLang);

            const savedTheme = localStorage.getItem("ks_theme");
            if (savedTheme === "dark") setDarkMode(true);

            const savedWorkers = localStorage.getItem("ks_workers_master");
            if (savedWorkers) setWorkers(JSON.parse(savedWorkers));

            const savedBookings = localStorage.getItem("ks_bookings");
            if (savedBookings) setBookings(JSON.parse(savedBookings));

            const savedFavs = localStorage.getItem("ks_favorites");
            if (savedFavs) setFavorites(JSON.parse(savedFavs));

            const savedPayouts = localStorage.getItem("ks_payouts_ledger");
            if (savedPayouts) setPayouts(JSON.parse(savedPayouts));
          }
        } catch (err) {
          console.warn("Storage sync notice:", err);
        }

        // Seamless background sync with PostgreSQL / Render backend
        if (typeof window !== "undefined") {
          fetch("/api/market")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data && data.workers && data.workers.length > 0) {
                setWorkers(data.workers);
              }
            })
            .catch(() => {
              // Cold start fallback
            });
        }
      }, []);

      // Sync dark mode class
      useEffect(() => {
        if (typeof window === "undefined" || !mounted) return;
        if (darkMode) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("ks_theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("ks_theme", "light");
        }
      }, [darkMode, mounted]);

      // Sync workers to storage
      useEffect(() => {
        if (typeof window === "undefined" || !mounted) return;
        localStorage.setItem("ks_workers_master", JSON.stringify(workers));
      }, [workers, mounted]);

      // Sync bookings to storage
      useEffect(() => {
        if (typeof window === "undefined" || !mounted) return;
        localStorage.setItem("ks_bookings", JSON.stringify(bookings));
      }, [bookings, mounted]);

      // Sync favorites to storage
      useEffect(() => {
        if (typeof window === "undefined" || !mounted) return;
        localStorage.setItem("ks_favorites", JSON.stringify(favorites));
      }, [favorites, mounted]);

      // Sync payouts to storage
      useEffect(() => {
        if (typeof window === "undefined" || !mounted) return;
        localStorage.setItem("ks_payouts_ledger", JSON.stringify(payouts));
      }, [payouts, mounted]);

      // Sync language in storage
      useEffect(() => {
        if (typeof window === "undefined" || !mounted) return;
        localStorage.setItem("ks_lang", lang);
        document.documentElement.lang = lang;
      }, [lang, mounted]);

      // Toaster Notification Helper (Supports Multi-Stack & Types)
      const showToast = (message: string, type: ToastType = "info", title?: string) => {
        const id = Math.random().toString(36).slice(2, 9);
        const newToast: ToastNotification = { id, message, type, title };
        setToasts((prev) => [newToast, ...prev].slice(0, 4));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4200);
      };

      const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      };

      // Filtered & Sorted Workers (For Customer Facing View: only show approved/verified)
      const filteredWorkers = useMemo(() => {
        return workers.filter(w => {
          // In customer view, don't show pending/rejected workers
          if (w.status && w.status !== "approved") return false;

          // Filter by favorites if active
          if (showOnlyFavorites && !favorites.includes(w.id)) return false;

          if (selectedSkill !== "all" && w.skill !== selectedSkill) return false;
          if (selectedArea !== "all" && w.area !== selectedArea) return false;
          if (selectedAvail !== "all" && w.avail !== selectedAvail) return false;
          if (maxPrice && w.rate > Number(maxPrice)) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const skillName = (SKILLS[w.skill]?.en + " " + SKILLS[w.skill]?.mr).toLowerCase();
            const matchName = w.name.toLowerCase().includes(q) || (w.nameMr && w.nameMr.includes(q));
            const matchArea = w.area.toLowerCase().includes(q);
            const matchBio = (w.bio + " " + (w.bioMr || "")).toLowerCase().includes(q);
            if (!matchName && !skillName.includes(q) && !matchArea && !matchBio) return false;
          }
          return true;
        }).sort((a, b) => {
          if (sortBy === "rating") return b.rating - a.rating;
          if (sortBy === "priceLow") return a.rate - b.rate;
          if (sortBy === "experience") return b.exp - a.exp;
          if (sortBy === "jobs") return b.jobs - a.jobs;
          return 0;
        });
      }, [workers, selectedSkill, selectedArea, selectedAvail, maxPrice, searchQuery, sortBy, showOnlyFavorites, favorites]);

      // Compare Toggle
      const toggleCompare = (workerId) => {
        setCompareList(prev => {
          if (prev.includes(workerId)) {
            return prev.filter(id => id !== workerId);
          } else {
            if (prev.length >= 3) {
              showToast(lang === "en" ? "You can compare up to 3 professionals at a time." : "तुम्ही एका वेळी जास्तीत जास्त ३ कारागिरांची तुलना करू शकता.");
              return prev;
            }
            return [...prev, workerId];
          }
        });
      };

      // Handle Booking Creation
      const handleCreateBooking = (bookingData) => {
        const estTotal = (bookingData.worker.rate || 400) + (bookingData.worker.visit || 150);
        const newBooking = {
          id: Date.now(),
          workerId: bookingData.worker.id,
          workerName: bookingData.worker.name,
          workerSkill: bookingData.worker.skill,
          workerArea: bookingData.worker.area,
          workerPhone: bookingData.worker.phone,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone,
          customerAddress: bookingData.customerAddress,
          date: bookingData.date,
          slot: bookingData.slot,
          jobNote: bookingData.jobNote,
          status: "confirmed",
          estimatedAmt: estTotal,
          createdAt: new Date().toLocaleDateString()
        };

        const updated = [newBooking, ...bookings];
        setBookings(updated);
        setBookingWorker(null);
        showToast(lang === "en" ? "Booking confirmed! Worker notified." : "बुकिंग निश्चित झाली! कारागिराला कळवले आहे.");
        setTrackingBooking(newBooking);
      };

      // Handle Worker Verification by Admin
      const handleApproveWorker = (id) => {
        setWorkers(prev => prev.map(w => w.id === id ? { ...w, verified: true, status: "approved" } : w));
        showToast(lang === "en" ? "Worker verified & approved successfully!" : "कारागीर मंजूर व पडताळणी पूर्ण झाली!");
      };

      // Handle Worker Deletion by Admin
      const handleDeleteWorker = (id) => {
        if (confirm(lang === "en" ? "Are you sure you want to remove this worker?" : "तुम्हाला खात्री आहे का हा कारागीर काढून टाकायचा?")) {
          setWorkers(prev => prev.filter(w => w.id !== id));
          showToast(lang === "en" ? "Worker profile removed." : "कारागीर प्रोफाईल काढले गेले.");
        }
      };

      // Handle Booking Status Update by Admin
      const handleUpdateBookingStatus = (id, newStatus) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
        showToast(`Booking #${id} status updated to ${newStatus}`);
      };

      // Export Bookings CSV
      const handleExportCSV = () => {
        const headers = ["Booking ID", "Customer Name", "Customer Phone", "Address", "Worker", "Trade", "Slot", "Date", "Status", "Amount (INR)"];
        const rows = bookings.map(b => [
          b.id,
          `"${b.customerName}"`,
          `"${b.customerPhone}"`,
          `"${b.customerAddress}"`,
          `"${b.workerName}"`,
          b.workerSkill,
          b.slot,
          b.date,
          b.status,
          b.estimatedAmt || 500
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `kaamsetu_bookings_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Reset System Data
      const handleResetDemoData = () => {
        if (confirm("Reset system workers and bookings back to initial defaults?")) {
          setWorkers(INITIAL_WORKERS);
          setBookings(INITIAL_BOOKINGS);
          localStorage.removeItem("ks_workers_master");
          localStorage.removeItem("ks_bookings");
          showToast("System demo data restored!");
        }
      };

      // Admin Stats Calculations
      const adminStats = useMemo(() => {
        const totalW = workers.length;
        const pendingW = workers.filter(w => w.status === "pending" || !w.verified).length;
        const totalB = bookings.length;
        const totalGMV = bookings.reduce((acc, curr) => acc + (curr.estimatedAmt || 550), 0);
        return { totalW, pendingW, totalB, totalGMV };
      }, [workers, bookings]);

// Payout calculations continue below

      // Dynamic Ledger Calculation for each worker
      const workerLedgerData = useMemo(() => {
        return workers.map((w) => {
          const wBookings = bookings.filter(b => b.workerId === w.id);
          const completedCount = wBookings.filter(b => b.status === "completed" || b.status === "paid").length;
          
          const dynamicBookingsGross = wBookings.reduce((sum, b) => sum + (b.estimatedAmt || 550), 0);
          const baselineGross = Math.round(Math.max(1500, (w.jobs || 8) * (w.rate || 350) * 0.38));
          const totalGross = Math.round(baselineGross + dynamicBookingsGross);

          // Tips: 7% of gross service value
          const tips = Math.round(totalGross * 0.07);

          // Commission: variable percentage of gross service
          const commission = Math.round(totalGross * (commissionRate / 100));

          // Net Payable
          const netEarnings = (totalGross + tips) - commission;

          // Payout History
          const record = payouts[w.id] || { settledAmt: 0, history: [] };
          const settledAmt = record.settledAmt || 0;
          const pendingBalance = Math.max(0, netEarnings - settledAmt);
          const isSettled = pendingBalance <= 0;

          const cleanName = (w.name || "worker").toLowerCase().replace(/[^a-z]/g, "");
          const phoneLast4 = (w.phone || "1234").slice(-4);
          const upiId = `${cleanName}.${phoneLast4}@oksbi`;
          const bankDetails = `HDFC Bank • A/C Ending ${phoneLast4} • IFSC: HDFC0001842`;

          return {
            worker: w,
            completedCount: (w.jobs || 0) + completedCount,
            totalGross,
            tips,
            commission,
            netEarnings,
            settledAmt,
            pendingBalance,
            isSettled,
            upiId,
            bankDetails,
            lastPayoutDate: record.lastPayoutDate || "No payout yet",
            lastTxRef: record.lastTxRef || "N/A",
            history: record.history || []
          };
        });
      }, [workers, bookings, payouts, commissionRate]);

      // Summary Totals
      const ledgerTotals = useMemo(() => {
        let totalGross = 0;
        let totalTips = 0;
        let totalCommission = 0;
        let totalNet = 0;
        let totalSettled = 0;
        let totalPending = 0;

        workerLedgerData.forEach(item => {
          totalGross += item.totalGross;
          totalTips += item.tips;
          totalCommission += item.commission;
          totalNet += item.netEarnings;
          totalSettled += item.settledAmt;
          totalPending += item.pendingBalance;
        });

        return { totalGross, totalTips, totalCommission, totalNet, totalSettled, totalPending };
      }, [workerLedgerData]);

      // Payout Action Handlers
      const handleDisbursePayout = (workerId, amount) => {
        if (amount <= 0) return;
        const txRef = `UPI-PAY-${workerId}-${Math.floor(10000 + Math.random() * 90000)}`;
        const dateStr = new Date().toLocaleDateString();

        setPayouts(prev => {
          const current = prev[workerId] || { settledAmt: 0, history: [] };
          const newSettled = current.settledAmt + amount;
          const newHistory = [
            { date: dateStr, amount, txRef, mode: "Instant UPI Transfer" },
            ...(current.history || [])
          ];
          return {
            ...prev,
            [workerId]: {
              settledAmt: newSettled,
              lastPayoutDate: dateStr,
              lastTxRef: txRef,
              history: newHistory
            }
          };
        });

        const targetWorker = workers.find(w => w.id === workerId);
        showToast(`${t.payoutSuccessToast} ${targetWorker?.name || 'Worker'} (₹${amount.toLocaleString()})! Tx: ${txRef}`);
      };

      const handleDisburseAllPending = () => {
        const pendingItems = workerLedgerData.filter(item => item.pendingBalance > 0);
        if (pendingItems.length === 0) {
          showToast(lang === "en" ? "All worker accounts are already settled!" : "सर्व कारागिरांचे पेआउट आधीच क्लिअर आहे!");
          return;
        }

        const dateStr = new Date().toLocaleDateString();
        setPayouts(prev => {
          const next = { ...prev };
          pendingItems.forEach(item => {
            const current = next[item.worker.id] || { settledAmt: 0, history: [] };
            const txRef = `BATCH-UPI-${item.worker.id}-${Math.floor(10000 + Math.random() * 90000)}`;
            next[item.worker.id] = {
              settledAmt: current.settledAmt + item.pendingBalance,
              lastPayoutDate: dateStr,
              lastTxRef: txRef,
              history: [
                { date: dateStr, amount: item.pendingBalance, txRef, mode: "Automated Batch UPI Payout" },
                ...(current.history || [])
              ]
            };
          });
          return next;
        });

        showToast(t.allSettledToast, "success", "Batch UPI Settlement Executed");
      };

      const handleExportPayoutCSV = () => {
        const headers = ["Worker ID", "Worker Name", "Trade", "Phone", "UPI VPA", "Bank Account", "Total Jobs", "Gross Service (INR)", "Customer Tips (INR)", "Platform Comm (INR)", "Net Payable (INR)", "Settled (INR)", "Pending Balance (INR)", "Status"];
        const rows = workerLedgerData.map(item => [
          item.worker.id,
          `"${item.worker.name}"`,
          item.worker.skill,
          item.worker.phone,
          item.upiId,
          `"${item.bankDetails}"`,
          item.completedCount,
          item.totalGross,
          item.tips,
          item.commission,
          item.netEarnings,
          item.settledAmt,
          item.pendingBalance,
          item.isSettled ? "Settled" : "Pending"
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `kaamsetu_payout_ledger_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Handle Send Chat
      const handleSendChat = (workerId) => {
        if (!currentChatInput.trim()) return;
        const thread = chatMessages[workerId] || [];
        const userMsg = { sender: "user", text: currentChatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        
        const newThread = [...thread, userMsg];
        setChatMessages(prev => ({ ...prev, [workerId]: newThread }));
        setCurrentChatInput("");

        // Automated polite reply simulation
        setTimeout(() => {
          const replyText = lang === "en" 
            ? "Namaste! Received your message. I am preparing my toolkit and will coordinate with you shortly."
            : "नमस्ते! तुमचा मेसेज मिळाला. मी माझी हत्यारे तयार करून थोड्याच वेळात तुम्हाला कॉल करतो.";
          setChatMessages(prev => ({
            ...prev,
            [workerId]: [...(prev[workerId] || []), {
              sender: "worker",
              text: replyText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]
          }));
        }, 1200);
      };

      return (
        <div className="flex flex-col min-h-screen">
          {/* TOASTER NOTIFICATIONS */}
          <Toaster toasts={toasts} onDismiss={dismissToast} />

          {/* HEADER / NAVIGATION */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-xs transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16 gap-4">
                
                {/* Brand Logo */}
                <div 
                  onClick={() => setActiveTab("find")}
                  className="flex items-center gap-2 cursor-pointer select-none group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
                    ⚡
                  </div>
                  <div>
                    <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                      {t.brand}<span className="text-amber-500">{t.brandHighlight}</span>
                    </span>
                    <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Verified Pros
                    </span>
                  </div>
                </div>

                {/* Nav Tabs */}
                <nav className="hidden lg:flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("find")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      activeTab === "find"
                        ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    🔍 {t.navFind}
                  </button>

                  <button
                    onClick={() => setActiveTab("emergency")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
                      activeTab === "emergency"
                        ? "bg-rose-500 text-white font-semibold shadow-sm"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    {t.navEmergency}
                  </button>

                  <button
                    onClick={() => setActiveTab("bookings")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all relative ${
                      activeTab === "bookings"
                        ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    📋 {t.navBookings}
                    {bookings.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs bg-emerald-500 text-white font-bold">
                        {bookings.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("join")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      activeTab === "join"
                        ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    👷 {t.navJoin}
                  </button>

                  {/* ADMIN TAB BUTTON */}
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
                      activeTab === "admin"
                        ? "bg-slate-900 text-amber-400 font-bold dark:bg-amber-400 dark:text-slate-950 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 ml-1"
                    }`}
                  >
                    <span>🛡️</span>
                    <span>{t.navAdmin}</span>
                    {adminStats.pendingW > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
                        {adminStats.pendingW}
                      </span>
                    )}
                  </button>
                </nav>

                {/* Right Actions: Duty Switch + PWA Install + Lang + Theme */}
                <div className="flex items-center gap-2">
                  {/* Worker Duty Quick Button */}
                  <button
                    onClick={() => setShowDutyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-sm hover:border-emerald-400 transition-colors"
                    title={t.dutySwitch}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="hidden md:inline">{t.dutySwitch}</span>
                  </button>

                  {/* PWA Install Button */}
                  {!isAppInstalled && (
                    <button
                      onClick={handleTriggerInstall}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-sm transition-transform active:scale-95"
                      title={t.installApp}
                    >
                      <span>📲</span>
                      <span className="hidden sm:inline">{t.installApp}</span>
                    </button>
                  )}

                  {/* Language Toggle Pill */}
                  <button
                    onClick={() => setLang(l => l === "en" ? "mr" : "en")}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold hover:border-amber-400 transition-colors"
                    title="Toggle Language / भाषा बदला"
                  >
                    <span>{lang === "en" ? "🇮🇳 मराठी" : "🇬🇧 English"}</span>
                  </button>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm hover:border-amber-400 transition-colors"
                    title="Toggle Theme"
                  >
                    {darkMode ? "☀️" : "🌙"}
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Row */}
              <div className="flex lg:hidden items-center justify-between py-2 border-t border-slate-200 dark:border-[#293d49] text-xs font-medium overflow-x-auto gap-1">
                <button
                  onClick={() => setActiveTab("find")}
                  className={`py-1 px-2.5 rounded whitespace-nowrap ${activeTab === "find" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
                >
                  🔍 {t.navFind}
                </button>
                <button
                  onClick={() => setActiveTab("emergency")}
                  className={`py-1 px-2.5 rounded whitespace-nowrap ${activeTab === "emergency" ? "bg-rose-500 text-white font-bold" : "text-rose-600 dark:text-rose-400"}`}
                >
                  ⚡ {t.navEmergency}
                </button>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={`py-1 px-2.5 rounded whitespace-nowrap ${activeTab === "bookings" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
                >
                  📋 {t.navBookings} ({bookings.length})
                </button>
                <button
                  onClick={() => setActiveTab("join")}
                  className={`py-1 px-2.5 rounded whitespace-nowrap ${activeTab === "join" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
                >
                  👷 {t.navJoin}
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`py-1 px-2.5 rounded whitespace-nowrap ${activeTab === "admin" ? "bg-slate-900 text-amber-400 font-bold dark:bg-amber-400 dark:text-slate-950" : "text-slate-600 dark:text-slate-400"}`}
                >
                  🛡️ {t.navAdmin} {adminStats.pendingW > 0 ? `(${adminStats.pendingW})` : ""}
                </button>
                <button
                  onClick={() => setShowDutyModal(true)}
                  className="py-1 px-2.5 rounded whitespace-nowrap bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-bold"
                >
                  ⚡ {t.dutySwitch}
                </button>
                {!isAppInstalled && (
                  <button
                    onClick={handleTriggerInstall}
                    className="py-1 px-2.5 rounded whitespace-nowrap bg-amber-400 text-slate-950 font-bold"
                  >
                    📲 {t.installApp}
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* VIEW: FIND WORKERS */}
          {activeTab === "find" && (
            <main className="flex-1 pb-24">
              {/* HERO SECTION */}
              <div className="bg-gradient-to-b from-slate-900 to-[#14232b] text-white pt-10 pb-16 px-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffc21a_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="max-w-6xl mx-auto relative z-10 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-4">
                    <span>⚡ Chhatrapati Sambhaji Nagar (Aurangabad) Service Network</span>
                  </div>
                  
                  <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight max-w-4xl mx-auto">
                    {t.tagline}
                  </h1>
                  <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-normal">
                    {t.subtitle}
                  </p>

                  {/* QUICK SEARCH & FILTER BAR */}
                  <div className="mt-8 bg-white dark:bg-[#1a2c36] text-slate-800 dark:text-slate-100 p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-[#293d49] text-left max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      
                      {/* Locality Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          📍 {t.localityLabel}
                        </label>
                        <select
                          value={selectedArea}
                          onChange={(e) => setSelectedArea(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                        >
                          <option value="all">{t.allAreas}</option>
                          {LOCALITIES.map(area => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>

                      {/* Availability */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          ⏱️ {t.availLabel}
                        </label>
                        <select
                          value={selectedAvail}
                          onChange={(e) => setSelectedAvail(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                        >
                          <option value="all">{t.allAvail}</option>
                          <option value="now">{t.availNow}</option>
                          <option value="today">{t.availToday}</option>
                          <option value="week">{t.availWeek}</option>
                        </select>
                      </div>

                      {/* Max Rate */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          💰 {t.maxPriceLabel}
                        </label>
                        <input
                          type="number"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          placeholder="₹ Any"
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Keyword Search */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          🔎 Keyword
                        </label>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t.searchPlaceholder}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>

                    </div>
                  </div>

                  {/* TRUST BULLETS */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 100% Verified Profiles</span>
                    <span className="flex items-center gap-1.5"><span className="text-amber-400">★</span> Direct Phone & WhatsApp</span>
                    <span className="flex items-center gap-1.5"><span className="text-blue-400">🛡️</span> Zero Middleman Markup</span>
                  </div>

                </div>
              </div>

              {/* STRIPE ACCENT */}
              <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"></div>

              {/* CONTENT CONTAINER */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

                {/* TRADE QUICK FILTER PILLS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 custom-scrollbar">
                  <button
                    onClick={() => setSelectedSkill("all")}
                    className={`flex-none px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      selectedSkill === "all"
                        ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    }`}
                  >
                    🛠️ {t.allCategories}
                  </button>
                  {Object.entries(SKILLS).map(([key, item]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedSkill(key)}
                      className={`flex-none px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        selectedSkill === key
                          ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{lang === "en" ? item.en : item.mr}</span>
                    </button>
                  ))}
                </div>

                {/* COUNT & SORT & TOOLS BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 my-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      <span className="text-slate-900 dark:text-white font-bold">{filteredWorkers.length}</span> {t.workersCount}
                    </div>

                    {/* Saved Favorites Filter Toggle */}
                    <button
                      onClick={() => setShowOnlyFavorites(prev => !prev)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                        showOnlyFavorites
                          ? "bg-rose-500 text-white shadow-sm ring-2 ring-rose-300"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-rose-400"
                      }`}
                    >
                      <span>❤️</span> {t.savedFavorites} ({favorites.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Diagnostic Cost Estimator Trigger Button */}
                    <button
                      onClick={() => setShowEstimatorModal(true)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <span>🧮</span> {t.calcCostBtn}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.sortBy}:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-amber-400"
                      >
                        <option value="rating">{t.sortRating}</option>
                        <option value="priceLow">{t.sortPriceLow}</option>
                        <option value="experience">{t.sortExperience}</option>
                        <option value="jobs">{t.sortJobs}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* WORKERS GRID */}
                {filteredWorkers.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 my-6">
                    <div className="text-4xl mb-2">🔍</div>
                    <div className="font-bold text-lg text-slate-700 dark:text-slate-200">No professionals matched your exact filters</div>
                    <p className="text-slate-500 text-sm mt-1">Try clearing some filters or searching with a different term.</p>
                    <button
                      onClick={() => { setSelectedSkill("all"); setSelectedArea("all"); setSelectedAvail("all"); setMaxPrice(""); setSearchQuery(""); }}
                      className="mt-4 px-4 py-2 bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg hover:bg-amber-300"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredWorkers.map(w => {
                      const skillObj = SKILLS[w.skill] || SKILLS.helper;
                      const isComparing = compareList.includes(w.id);

                      return (
                        <div
                          key={w.id}
                          className="bg-white dark:bg-[#1a2c36] rounded-2xl border border-slate-200 dark:border-[#293d49] hover:border-amber-400/80 dark:hover:border-amber-400/80 transition-all p-5 shadow-sm hover:shadow-md flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Top: Avatar, Name, Verification, Trade */}
                            <div className="flex items-start gap-3.5">
                              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-2xl flex items-center justify-center font-bold flex-none shadow-inner border border-amber-300 dark:border-amber-600">
                                {skillObj.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white truncate">
                                    {lang === "en" ? w.name : (w.nameMr || w.name)}
                                  </h3>
                                  {w.verified && (
                                    <span className="text-blue-500 text-xs flex-none" title={t.verifiedBadge}>
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {lang === "en" ? skillObj.en : skillObj.mr}
                                  </span>
                                  <span>•</span>
                                  <span>{w.area}</span>
                                </div>
                              </div>

                              {/* Availability Badge & Favorite Heart */}
                              <div className="flex items-center gap-1.5 flex-none">
                                <button
                                  onClick={(e) => handleToggleFavorite(w.id, e)}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                                    favorites.includes(w.id)
                                      ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                                      : "bg-slate-100 text-slate-400 hover:text-rose-500 dark:bg-slate-800"
                                  }`}
                                  title={favorites.includes(w.id) ? "Remove from Favorites" : "Add to Favorites"}
                                >
                                  {favorites.includes(w.id) ? "❤️" : "🤍"}
                                </button>

                                {w.avail === "now" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {t.dutyOnline.split(" ")[0]}
                                  </span>
                                ) : w.avail === "busy" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    {t.dutyBusy.split(" ")[0]}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    {t.dutyOffline.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ratings, Jobs, Exp & Audio Readout */}
                            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 my-3.5 border border-slate-100 dark:border-slate-800">
                              <span className="flex items-center gap-1 text-amber-500 font-bold">
                                ★ {w.rating} <span className="text-slate-400 font-normal">({w.reviews.length})</span>
                              </span>
                              <span>•</span>
                              <span>{w.exp} {t.experience}</span>
                              <span>•</span>
                              <button
                                onClick={(e) => handleToggleVoice(w, e)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                                  speakingWorkerId === w.id
                                    ? "bg-amber-400 text-slate-950 animate-pulse shadow-sm"
                                    : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-amber-400"
                                }`}
                                title="Listen to profile details via voice audio"
                              >
                                <span>{speakingWorkerId === w.id ? "🔊" : "🔈"}</span>
                                <span>{speakingWorkerId === w.id ? t.speakingNow : t.listenVoice}</span>
                              </button>
                            </div>

                            {/* Short Bio */}
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {lang === "en" ? w.bio : (w.bioMr || w.bio)}
                            </p>

                            {/* Work Samples Thumbnails */}
                            {w.workSamples && w.workSamples.length > 0 && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Samples:</span>
                                <div className="flex gap-1.5 overflow-hidden">
                                  {w.workSamples.slice(0, 2).map((imgUrl, i) => (
                                    <img
                                      key={i}
                                      src={imgUrl}
                                      alt="sample"
                                      onClick={() => setDetailWorker(w)}
                                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Bottom: Rates & Actions */}
                          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-baseline justify-between mb-3">
                              <div>
                                <span className="text-xs text-slate-400 block">{t.hourlyRate}</span>
                                <span className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                                  ₹{w.rate}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-slate-400 block">{t.visitingFee}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  ₹{w.visit}
                                </span>
                              </div>
                            </div>

                            {/* Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setBookingWorker(w)}
                                className="w-full py-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors text-center"
                              >
                                {t.bookNow}
                              </button>
                              <button
                                onClick={() => setDetailWorker(w)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors text-center"
                              >
                                {t.viewProfile}
                              </button>
                            </div>

                            {/* Compare Checkbox & Direct Chat / WhatsApp */}
                            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isComparing}
                                  onChange={() => toggleCompare(w.id)}
                                  className="w-3.5 h-3.5 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                                />
                                <span>{t.compare}</span>
                              </label>

                              <div className="flex items-center gap-2.5">
                                <a
                                  href={getWorkerInquiryWhatsAppUrl(w)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                                  title="WhatsApp Inquiry"
                                >
                                  <span>💬</span> {t.whatsappChat}
                                </a>
                                <span>•</span>
                                <button
                                  onClick={() => setChatWorker(w)}
                                  className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                                >
                                  ⚡ Chat
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </main>
          )}

          {/* VIEW: EMERGENCY 15-MINUTE SERVICE */}
          {activeTab === "emergency" && (
            <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
              <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    15-Minute Rapid Response
                  </div>

                  <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
                    {t.emergencyTitle}
                  </h2>
                  <p className="mt-2 text-rose-100 text-sm sm:text-base max-w-xl">
                    {t.emergencySubtitle}
                  </p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        const plumber = workers.find(w => w.skill === "plumber" && w.avail === "now" && w.verified) || workers[0];
                        setBookingWorker(plumber);
                      }}
                      className="bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl p-4 text-left backdrop-blur-sm transition-all"
                    >
                      <div className="text-3xl mb-1">🚰</div>
                      <div className="font-bold text-sm">Water Leak / Burst Pipe</div>
                      <div className="text-xs text-rose-100 mt-1">Plumber dispatched in 15 mins</div>
                    </button>

                    <button
                      onClick={() => {
                        const elec = workers.find(w => w.skill === "electrician" && w.avail === "now" && w.verified) || workers[1];
                        setBookingWorker(elec);
                      }}
                      className="bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl p-4 text-left backdrop-blur-sm transition-all"
                    >
                      <div className="text-3xl mb-1">⚡</div>
                      <div className="font-bold text-sm">Short Circuit / Blackout</div>
                      <div className="text-xs text-rose-100 mt-1">Electrician on emergency call</div>
                    </button>

                    <button
                      onClick={() => {
                        const carp = workers.find(w => w.skill === "carpenter" && w.verified) || workers[2];
                        setBookingWorker(carp);
                      }}
                      className="bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl p-4 text-left backdrop-blur-sm transition-all"
                    >
                      <div className="text-3xl mb-1">🔒</div>
                      <div className="font-bold text-sm">Locked Out / Door Stuck</div>
                      <div className="text-xs text-rose-100 mt-1">Carpenter with lockpick tools</div>
                    </button>
                  </div>

                  <div className="mt-8 pt-6 border-t border-rose-400/40 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-rose-100">
                      Standard emergency surcharge: ₹100 flat. Direct phone coordination upon request.
                    </div>
                    <a
                      href="tel:9822104521"
                      className="px-5 py-2.5 bg-white text-rose-700 font-extrabold text-sm rounded-xl shadow-lg hover:bg-rose-50 transition-colors"
                    >
                      📞 Direct Emergency Helpline
                    </a>
                  </div>

                </div>
              </div>
            </main>
          )}

          {/* VIEW: MY BOOKINGS */}
          {activeTab === "bookings" && (
            <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    {t.myBookingsTitle}
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                    Track your active appointments, view arrival timeline, and call your worker.
                  </p>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#1a2c36] rounded-2xl border border-slate-200 dark:border-[#293d49] p-8 shadow-sm">
                  <div className="text-5xl mb-3">📅</div>
                  <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">{t.noBookings}</h3>
                  <button
                    onClick={() => setActiveTab("find")}
                    className="mt-4 px-5 py-2.5 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:bg-amber-300"
                  >
                    Browse & Book Skilled Workers
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((b) => {
                    const skillObj = SKILLS[b.workerSkill] || SKILLS.helper;
                    return (
                      <div
                        key={b.id}
                        className="bg-white dark:bg-[#1a2c36] rounded-2xl border border-slate-200 dark:border-[#293d49] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-2xl flex items-center justify-center flex-none">
                            {skillObj.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                                {b.workerName}
                              </h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                b.status === "completed" ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" :
                                b.status === "in-progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" :
                                "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}>
                                {b.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {skillObj.en} • {b.date} • {b.slot} • Est. ₹{b.estimatedAmt || 550}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                              "{b.jobNote || "General repair work"}"
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                          {/* Payment / Receipt Trigger */}
                          {b.status === "paid" ? (
                            <button
                              onClick={() => setPaymentBooking(b)}
                              className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                            >
                              ✅ Paid • Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() => setPaymentBooking(b)}
                              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                            >
                              💳 {t.payUpiBtn}
                            </button>
                          )}

                          {/* WhatsApp Work Slip */}
                          <a
                            href={getWhatsAppOrderUrl(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1"
                            title="Send dispatch work order slip via WhatsApp"
                          >
                            <span>💬</span> {t.whatsappOrder}
                          </a>

                          {b.reviewed ? (
                            <span className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm">
                              ★ Rated {b.userRating}/5
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                const w = workers.find(x => x.id === b.workerId) || { id: b.workerId, name: b.workerName, skill: b.workerSkill };
                                handleOpenReview(w, b.id, b.customerName);
                              }}
                              className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 transition-colors flex items-center gap-1.5"
                            >
                              ★ {t.leaveReview}
                            </button>
                          )}
                          <button
                            onClick={() => setTrackingBooking(b)}
                            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            🗺️ {t.trackLiveBtn}
                          </button>
                          <a
                            href={`tel:${b.workerPhone}`}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            📞 {t.callWorker}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          )}

          {/* VIEW: WORKER REGISTRATION (JOIN AS PRO) */}
          {activeTab === "join" && (
            <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Registration Form */}
                <div className="lg:col-span-7 bg-white dark:bg-[#1a2c36] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                    {t.joinTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
                    {t.joinSubtitle}
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target;
                      const newPro = {
                        id: Date.now(),
                        name: form.wName.value,
                        nameMr: form.wName.value,
                        skill: form.wSkill.value,
                        exp: Number(form.wExp.value) || 3,
                        area: form.wArea.value,
                        rate: Number(form.wRate.value) || 400,
                        visit: Number(form.wVisit.value) || 150,
                        rating: 5.0,
                        jobs: 0,
                        avail: "today",
                        verified: false,
                        status: "pending",
                        phone: form.wPhone.value,
                        bio: form.wBio.value || "Experienced professional ready for local jobs.",
                        bioMr: form.wBio.value || "अनुभवी कारागीर.",
                        reviews: []
                      };

                      setWorkers(prev => [newPro, ...prev]);
                      showToast(t.joinSuccess);
                      form.reset();
                      setActiveTab("admin");
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {t.joinName} *
                      </label>
                      <input
                        name="wName"
                        required
                        placeholder="e.g. Rameshwar Gavhane"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {t.joinSkill} *
                        </label>
                        <select
                          name="wSkill"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                        >
                          {Object.entries(SKILLS).map(([k, s]) => (
                            <option key={k} value={k}>{s.icon} {s.en} ({s.mr})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {t.joinExp} *
                        </label>
                        <input
                          type="number"
                          name="wExp"
                          min="0"
                          max="45"
                          defaultValue="5"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {t.joinArea} *
                        </label>
                        <select
                          name="wArea"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                        >
                          {LOCALITIES.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {t.joinRate} *
                        </label>
                        <input
                          type="number"
                          name="wRate"
                          step="50"
                          defaultValue="450"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {t.joinVisit} *
                        </label>
                        <input
                          type="number"
                          name="wVisit"
                          step="25"
                          defaultValue="150"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {t.joinPhone} *
                      </label>
                      <input
                        type="tel"
                        name="wPhone"
                        maxLength="10"
                        pattern="[6-9][0-9]{9}"
                        required
                        placeholder="10-digit mobile number"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {t.joinBio}
                      </label>
                      <textarea
                        name="wBio"
                        rows="3"
                        placeholder="Tell customers what you specialize in..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition-colors"
                    >
                      {t.joinSubmit}
                    </button>
                  </form>
                </div>

                {/* Benefits / Trust Box */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 p-6 rounded-3xl shadow-lg">
                    <h3 className="font-display font-extrabold text-xl mb-2">
                      Why Join KaamSetu?
                    </h3>
                    <ul className="space-y-3 text-xs sm:text-sm font-semibold">
                      <li className="flex items-start gap-2">
                        <span>💎</span> 0% Commission: Keep 100% of your earnings directly from customers.
                      </li>
                      <li className="flex items-start gap-2">
                        <span>📱</span> Direct Phone Calls: Customers call or WhatsApp you directly.
                      </li>
                      <li className="flex items-start gap-2">
                        <span>📍</span> Work in Your Area: Receive orders strictly in your preferred locality.
                      </li>
                      <li className="flex items-start gap-2">
                        <span>🛡️</span> Verified Pro Badge: Stand out with high customer trust and ratings.
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-[#1a2c36] p-6 rounded-3xl border border-slate-200 dark:border-[#293d49] text-xs text-slate-500 dark:text-slate-400 space-y-2">
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">Need Help Registering?</div>
                    <p>Visit our KaamSetu Helpdesk in Cidco or contact our worker onboarding helpline at <strong>+91 98221 00000</strong>.</p>
                  </div>
                </div>

              </div>
            </main>
          )}

          {/* VIEW: ADMIN MANAGEMENT PANEL */}
          {activeTab === "admin" && (
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
              {/* Admin Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                      Operations Console
                    </span>
                    <span className="text-xs text-slate-400">v2.4 Live</span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">
                    {t.adminTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {t.adminSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    📥 {t.exportBookingsCSV}
                  </button>

                  <button
                    onClick={handleResetDemoData}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-300 dark:border-rose-800 transition-colors"
                  >
                    🔄 {t.resetDemo}
                  </button>
                </div>
              </div>

              {/* EXECUTIVE BESPOKE STATS COMMAND STRIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                {/* 1. Craftsmen Roster */}
                <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-100/60 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Verified Network
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm">
                      👷
                    </span>
                  </div>
                  <div className="font-display font-black text-3xl sm:text-4xl text-slate-900 mt-2">
                    {adminStats.totalW}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{workers.filter(w => w.verified).length} Approved • {adminStats.pendingW} Pending Review</span>
                  </div>
                </div>

                {/* 2. Direct Service Volume */}
                <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-100/50 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Gross Service Value
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm">
                      ₹
                    </span>
                  </div>
                  <div className="font-display font-black text-3xl sm:text-4xl text-slate-900 mt-2">
                    ₹{adminStats.totalGMV.toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-amber-800 font-semibold flex items-center gap-1">
                    <span>100% Passed to Verified Pros</span>
                  </div>
                </div>

                {/* 3. Disbursed Earnings */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Settled Payouts
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-sm">
                      ✓
                    </span>
                  </div>
                  <div className="font-display font-black text-3xl sm:text-4xl text-slate-900 mt-2">
                    ₹{ledgerTotals.totalSettled.toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-medium">
                    Instant UPI & IMPS transfers
                  </div>
                </div>

                {/* 4. Pending Settlements */}
                <div className="bg-gradient-to-br from-amber-50/80 via-white to-white p-5 rounded-3xl border-2 border-amber-300 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Pending Payouts
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-sm shadow-xs">
                      ⚡
                    </span>
                  </div>
                  <div className="font-display font-black text-3xl sm:text-4xl text-amber-950 mt-2">
                    ₹{ledgerTotals.totalPending.toLocaleString()}
                  </div>
                  <div className="mt-2">
                    {ledgerTotals.totalPending > 0 ? (
                      <button
                        onClick={handleDisburseAllPending}
                        className="w-full mt-1 py-1.5 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        ⚡ 1-Click UPI Disburse All
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold">● All worker accounts settled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* MINIMALIST BESPOKE DASHBOARD NAVIGATION */}
              <div className="flex items-center gap-2 border-b border-amber-200/60 pb-3 mb-6 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => setAdminSubTab("workers")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    adminSubTab === "workers"
                      ? "bg-amber-400 text-slate-950 shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/70 border border-slate-200"
                  }`}
                >
                  👷 Craftsmen Roster ({workers.length})
                </button>

                <button
                  onClick={() => setAdminSubTab("bookings")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    adminSubTab === "bookings"
                      ? "bg-amber-400 text-slate-950 shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/70 border border-slate-200"
                  }`}
                >
                  📋 Dispatch Board ({bookings.length})
                </button>

                <button
                  onClick={() => setAdminSubTab("payouts")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    adminSubTab === "payouts"
                      ? "bg-amber-400 text-slate-950 shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/70 border border-slate-200"
                  }`}
                >
                  <span>💰</span> UPI Earnings Ledger
                  {ledgerTotals.totalPending > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold shadow-xs animate-pulse">
                      ₹{ledgerTotals.totalPending.toLocaleString()}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setAdminSubTab("analytics")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    adminSubTab === "analytics"
                      ? "bg-amber-400 text-slate-950 shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/70 border border-slate-200"
                  }`}
                >
                  📈 Platform Intelligence
                </button>
              </div>

              {/* SUB-TAB 1: WORKERS & KYC TABLE */}
              {adminSubTab === "workers" && (
                <div className="bg-white dark:bg-[#1a2c36] rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                      All Registered Professionals ({workers.length})
                    </div>
                    <input
                      type="text"
                      placeholder="Search worker by name, skill, area, phone..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 w-72"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3.5">Worker</th>
                          <th className="p-3.5">Trade</th>
                          <th className="p-3.5">Locality</th>
                          <th className="p-3.5">Rates</th>
                          <th className="p-3.5">KYC Status</th>
                          <th className="p-3.5">Live Duty</th>
                          <th className="p-3.5">Jobs / Rating</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {workers
                          .filter(w => {
                            if (!adminSearch.trim()) return true;
                            const q = adminSearch.toLowerCase();
                            return w.name.toLowerCase().includes(q) || 
                                   w.area.toLowerCase().includes(q) || 
                                   w.skill.toLowerCase().includes(q) ||
                                   w.phone.includes(q);
                          })
                          .map(w => {
                            const isApproved = w.status === "approved" || w.verified;
                            return (
                              <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                <td className="p-3.5">
                                  <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                                    {w.name}
                                  </div>
                                  <div className="text-slate-400 text-[11px]">
                                    📞 {w.phone}
                                  </div>
                                </td>
                                <td className="p-3.5 font-medium capitalize">
                                  {SKILLS[w.skill]?.icon} {SKILLS[w.skill]?.en}
                                </td>
                                <td className="p-3.5 text-slate-600 dark:text-slate-300">
                                  {w.area}
                                </td>
                                <td className="p-3.5">
                                  <div className="font-bold text-amber-500">₹{w.rate}/hr</div>
                                  <div className="text-slate-400 text-[10px]">₹{w.visit} visit</div>
                                </td>
                                <td className="p-3.5">
                                  {isApproved ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                      ✓ {t.approvedBadge}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                      ⏳ {t.pendingBadge}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <select
                                    value={w.avail || "now"}
                                    onChange={(e) => handleUpdateWorkerDuty(w.id, e.target.value)}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none ${
                                      w.avail === "now" ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300" :
                                      w.avail === "busy" ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300" :
                                      "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    <option value="now">🟢 Online</option>
                                    <option value="busy">🟡 Busy</option>
                                    <option value="week">🔴 Offline</option>
                                  </select>
                                </td>
                                <td className="p-3.5">
                                  <span className="font-semibold text-amber-500">★ {w.rating}</span> ({w.jobs} jobs)
                                </td>
                                <td className="p-3.5 text-right space-x-1.5">
                                  {!isApproved && (
                                    <button
                                      onClick={() => handleApproveWorker(w.id)}
                                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
                                    >
                                      {t.approveVerify}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setDetailWorker(w)}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs transition-colors"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDeleteWorker(w.id)}
                                    className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold rounded-lg text-xs transition-colors"
                                    title="Delete Profile"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: MASTER BOOKINGS TABLE */}
              {adminSubTab === "bookings" && (
                <div className="bg-white dark:bg-[#1a2c36] rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                      Customer Service Requests ({bookings.length})
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{t.filterStatus}:</span>
                      <select
                        value={adminBookingFilter}
                        onChange={(e) => setAdminBookingFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="all">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3.5">ID / Date</th>
                          <th className="p-3.5">Customer & Phone</th>
                          <th className="p-3.5">Address</th>
                          <th className="p-3.5">Assigned Pro</th>
                          <th className="p-3.5">Problem / Note</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bookings
                          .filter(b => adminBookingFilter === "all" || b.status === adminBookingFilter)
                          .map(b => (
                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">#{b.id}</span>
                                <div className="text-slate-400 text-[11px]">{b.date} ({b.slot})</div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-900 dark:text-white">{b.customerName}</div>
                                <div className="text-slate-400 text-[11px]">📞 {b.customerPhone}</div>
                              </td>
                              <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={b.customerAddress}>
                                {b.customerAddress}
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-amber-600 dark:text-amber-400">{b.workerName}</div>
                                <div className="text-slate-400 text-[11px] capitalize">{b.workerSkill} ({b.workerArea})</div>
                              </td>
                              <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={b.jobNote}>
                                "{b.jobNote}"
                              </td>
                              <td className="p-3.5">
                                <select
                                  value={b.status}
                                  onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none ${
                                    b.status === "completed" ? "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-700 dark:text-slate-300" :
                                    b.status === "in-progress" ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-700 dark:text-blue-300" :
                                    b.status === "cancelled" ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300" :
                                    "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                                  }`}
                                >
                                  <option value="confirmed">Confirmed</option>
                                  <option value="in-progress">In-Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td className="p-3.5 text-right space-x-1">
                                <button
                                  onClick={() => setTrackingBooking(b)}
                                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs"
                                >
                                  🗺️ Map
                                </button>
                                <a
                                  href={`tel:${b.customerPhone}`}
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs inline-block"
                                >
                                  📞 Call
                                </a>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: CITYWIDE ANALYTICS & INSIGHTS */}
              {adminSubTab === "analytics" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Demand Share */}
                  <div className="bg-white dark:bg-[#1a2c36] p-6 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">
                      Top Services Breakdown
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(SKILLS).map(([k, s]) => {
                        const count = workers.filter(w => w.skill === k).length;
                        const pct = Math.round((count / (workers.length || 1)) * 100);
                        return (
                          <div key={k}>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>{s.icon} {s.en}</span>
                              <span>{count} workers ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Locality Distribution */}
                  <div className="bg-white dark:bg-[#1a2c36] p-6 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">
                      Active Locality Coverage
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {LOCALITIES.map(area => {
                        const count = workers.filter(w => w.area === area).length;
                        return (
                          <div key={area} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">📍 {area}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                              {count} pros
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: WORKER EARNINGS & PAYOUT LEDGER */}
              {adminSubTab === "payouts" && (
                <div className="space-y-6">
                  
                  {/* Ledger Metrics Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                    <div className="bg-white dark:bg-[#1a2c36] p-4 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Gross Service Vol.
                      </span>
                      <div className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white mt-1">
                        ₹{ledgerTotals.totalGross.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">Total job bookings value</span>
                    </div>

                    <div className="bg-white dark:bg-[#1a2c36] p-4 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {t.statTips}
                      </span>
                      <div className="font-display font-extrabold text-xl sm:text-2xl text-amber-500 mt-1">
                        ₹{ledgerTotals.totalTips.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">100% disbursed to workers</span>
                    </div>

                    <div className="bg-white dark:bg-[#1a2c36] p-4 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          {t.statCommFee} ({commissionRate}%)
                        </span>
                        <div className="flex gap-1">
                          {[0, 5, 8, 10].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => setCommissionRate(rate)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                commissionRate === rate
                                  ? "bg-amber-400 text-slate-950 shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {rate}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="font-display font-extrabold text-xl sm:text-2xl text-blue-500 mt-1">
                        ₹{ledgerTotals.totalCommission.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-blue-400">Platform operational fee</span>
                    </div>

                    <div className="bg-white dark:bg-[#1a2c36] p-4 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {t.statDisbursed}
                      </span>
                      <div className="font-display font-extrabold text-xl sm:text-2xl text-emerald-500 mt-1">
                        ₹{ledgerTotals.totalSettled.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Transferred to bank/UPI</span>
                    </div>

                    <div className="bg-white dark:bg-[#1a2c36] p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm bg-rose-50/40 dark:bg-rose-950/20">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                        {t.statPendingPayout}
                      </span>
                      <div className="font-display font-extrabold text-xl sm:text-2xl text-rose-600 dark:text-rose-400 mt-1 animate-pulse">
                        ₹{ledgerTotals.totalPending.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-rose-500 font-semibold">Awaiting transfer</span>
                    </div>
                  </div>

                  {/* Actions & Filters Bar */}
                  <div className="bg-white dark:bg-[#1a2c36] p-4 rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Search worker by name, skill, phone, or UPI..."
                        value={payoutSearch}
                        onChange={(e) => setPayoutSearch(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 w-64"
                      />

                      <select
                        value={payoutFilter}
                        onChange={(e) => setPayoutFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="all">All Accounts ({workerLedgerData.length})</option>
                        <option value="pending">Pending Payout Only</option>
                        <option value="settled">Fully Settled Only</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDisburseAllPending}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>⚡</span> {t.disburseAllBtn} (₹{ledgerTotals.totalPending.toLocaleString()})
                      </button>

                      <button
                        onClick={handleExportPayoutCSV}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span>📥</span> {t.exportPayoutCSV}
                      </button>
                    </div>
                  </div>

                  {/* Payout Ledger Table */}
                  <div className="bg-white dark:bg-[#1a2c36] rounded-2xl border border-slate-200 dark:border-[#293d49] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3.5">{t.colWorkerPro}</th>
                            <th className="p-3.5">{t.colCompletedJobs}</th>
                            <th className="p-3.5">{t.colGrossService}</th>
                            <th className="p-3.5">{t.colCustomerTips}</th>
                            <th className="p-3.5">{t.colPlatformComm} ({commissionRate}%)</th>
                            <th className="p-3.5">{t.colNetPayable}</th>
                            <th className="p-3.5">Settled Amount</th>
                            <th className="p-3.5">Balance Due</th>
                            <th className="p-3.5">{t.colPayoutStatus}</th>
                            <th className="p-3.5 text-right">{t.colDisburseAction}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                          {(() => {
                            const filtered = workerLedgerData.filter(item => {
                              if (payoutFilter === "pending" && item.isSettled) return false;
                              if (payoutFilter === "settled" && !item.isSettled) return false;
                              if (payoutSearch.trim()) {
                                const q = payoutSearch.toLowerCase();
                                const matchName = item.worker.name.toLowerCase().includes(q) || (item.worker.nameMr && item.worker.nameMr.includes(q));
                                const matchSkill = item.worker.skill.toLowerCase().includes(q);
                                const matchPhone = item.worker.phone.includes(q);
                                const matchUpi = item.upiId.toLowerCase().includes(q);
                                if (!matchName && !matchSkill && !matchPhone && !matchUpi) return false;
                              }
                              return true;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="10" className="p-8 text-center text-slate-400 italic">
                                    No worker payout accounts matching current filters.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((item) => {
                              const w = item.worker;
                              return (
                                <tr key={w.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-3.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs flex-none">
                                        {SKILLS[w.skill]?.icon || "🔧"}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                          <span>{lang === "en" ? w.name : (w.nameMr || w.name)}</span>
                                          <span className="text-[10px] text-slate-400 uppercase font-mono">({w.skill})</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-mono">
                                          UPI: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.upiId}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                                    {item.completedCount} jobs
                                  </td>

                                  <td className="p-3.5 font-semibold">
                                    ₹{item.totalGross.toLocaleString()}
                                  </td>

                                  <td className="p-3.5 font-semibold text-amber-600 dark:text-amber-400">
                                    +₹{item.tips.toLocaleString()}
                                  </td>

                                  <td className="p-3.5 font-semibold text-rose-500">
                                    -₹{item.commission.toLocaleString()}
                                  </td>

                                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                                    ₹{item.netEarnings.toLocaleString()}
                                  </td>

                                  <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                    ₹{item.settledAmt.toLocaleString()}
                                  </td>

                                  <td className="p-3.5">
                                    <span className={`font-display font-extrabold text-sm ${item.pendingBalance > 0 ? "text-rose-500" : "text-slate-400"}`}>
                                      ₹{item.pendingBalance.toLocaleString()}
                                    </span>
                                  </td>

                                  <td className="p-3.5">
                                    {item.isSettled ? (
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                        {t.statusSettled}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                        {t.statusPendingPayout}
                                      </span>
                                    )}
                                  </td>

                                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                    {item.pendingBalance > 0 && (
                                      <button
                                        onClick={() => handleDisbursePayout(w.id, item.pendingBalance)}
                                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
                                        title="Send UPI / IMPS payout immediately"
                                      >
                                        ⚡ Pay ₹{item.pendingBalance.toLocaleString()}
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setSelectedLedgerWorker(item)}
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs transition-colors"
                                    >
                                      📜 Ledger
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </main>
          )}

          {/* FLOATING COMPARISON BAR DOCK */}
          {compareList.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 dark:bg-[#0d171d]/95 backdrop-blur-md border-t border-slate-700 text-white p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-sm">
                  {compareList.length}
                </span>
                <span className="text-xs sm:text-sm font-medium">
                  {compareList.length} {t.compareDockTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  📊 {t.compareBtn}
                </button>
                <button
                  onClick={() => setCompareList([])}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  ✕ {t.clearCompare}
                </button>
              </div>
            </div>
          )}

          {/* MODAL: SIDE-BY-SIDE COMPARISON */}
          {showCompareModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-display font-bold text-xl">{t.compareModalTitle}</h3>
                  <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
                </div>

                <div className="p-5 overflow-auto custom-scrollbar">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="p-3 text-slate-400 font-medium">Metric</th>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return (
                              <th key={id} className="p-3 font-display font-bold text-sm text-slate-900 dark:text-white">
                                {w?.name}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colTrade}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3 font-medium capitalize">{SKILLS[w?.skill]?.en}</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colRate}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3 font-bold text-amber-500 text-sm">₹{w?.rate}/hr</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colVisit}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3">₹{w?.visit}</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colRating}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3 font-semibold text-amber-500">★ {w?.rating} ({w?.jobs} jobs)</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colExp}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3">{w?.exp} yrs</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colArea}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3">{w?.area}</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">{t.colAvail}</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return <td key={id} className="p-3 capitalize">{w?.avail}</td>;
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-400">Action</td>
                          {compareList.map(id => {
                            const w = workers.find(x => x.id === id);
                            return (
                              <td key={id} className="p-3">
                                <button
                                  onClick={() => {
                                    setShowCompareModal(false);
                                    setBookingWorker(w);
                                  }}
                                  className="px-3 py-1.5 bg-amber-400 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-300"
                                >
                                  {t.bookNow}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: WORKER DETAILS & SAMPLES */}
          {detailWorker && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-display font-bold text-xl">{detailWorker.name}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {SKILLS[detailWorker.skill]?.en} • {detailWorker.area} • {detailWorker.exp} yrs experience
                    </div>
                  </div>
                  <button onClick={() => setDetailWorker(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                  {/* Bio */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">About & Specialties</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {lang === "en" ? detailWorker.bio : (detailWorker.bioMr || detailWorker.bio)}
                    </p>
                  </div>

                  {/* Portfolio Work Samples */}
                  {detailWorker.workSamples && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Previous Work Samples</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {detailWorker.workSamples.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt="work sample"
                            className="w-full h-44 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Reviews */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Verified Customer Reviews ({detailWorker.reviews.length})</h4>
                    <div className="space-y-2">
                      {detailWorker.reviews.map((rev, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{rev.user}</span>
                            <span className="text-amber-500">★ {rev.rating}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">"{rev.text}"</p>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{rev.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Rate:</span>
                    <span className="font-display font-extrabold text-xl text-slate-900 dark:text-white ml-1">₹{detailWorker.rate}</span>
                    <span className="text-xs text-slate-400">/hr</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const target = detailWorker;
                        setDetailWorker(null);
                        handleOpenReview(target);
                      }}
                      className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 transition-colors"
                    >
                      ★ Rate Pro
                    </button>
                    <button
                      onClick={() => {
                        setDetailWorker(null);
                        setChatWorker(detailWorker);
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl"
                    >
                      💬 Message
                    </button>
                    <button
                      onClick={() => {
                        const target = detailWorker;
                        setDetailWorker(null);
                        setBookingWorker(target);
                      }}
                      className="px-5 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:bg-amber-300"
                    >
                      {t.bookNow}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: BOOKING FORM */}
          {bookingWorker && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-display font-bold text-xl">{t.bookingModalTitle} {bookingWorker.name}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {SKILLS[bookingWorker.skill]?.en} • ₹{bookingWorker.rate}/hr • ₹{bookingWorker.visit} visit
                    </div>
                  </div>
                  <button onClick={() => setBookingWorker(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = e.target;
                    handleCreateBooking({
                      worker: bookingWorker,
                      customerName: f.cName.value,
                      customerPhone: f.cPhone.value,
                      customerAddress: f.cAddress.value,
                      date: f.bDate.value,
                      slot: f.bSlot.value,
                      jobNote: f.bNote.value
                    });
                  }}
                  className="p-6 overflow-y-auto custom-scrollbar space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.selectDate} *</label>
                      <input
                        type="date"
                        name="bDate"
                        required
                        defaultValue={new Date().toISOString().split("T")[0]}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.selectSlot} *</label>
                      <select
                        name="bSlot"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="Immediate">{t.slotNow}</option>
                        <option value="Morning">{t.slotMorning}</option>
                        <option value="Afternoon">{t.slotAfternoon}</option>
                        <option value="Evening">{t.slotEvening}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.jobDescription}</label>
                    <textarea
                      name="bNote"
                      rows="2"
                      required
                      defaultValue={bookingWorker.customJobNote || ""}
                      placeholder={t.jobPlaceholder}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.customerName} *</label>
                    <input
                      name="cName"
                      required
                      placeholder="e.g. Ajay Patil"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.customerPhone} *</label>
                    <input
                      type="tel"
                      name="cPhone"
                      required
                      pattern="[6-9][0-9]{9}"
                      placeholder="10-digit mobile number"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.customerAddress} *</label>
                    <input
                      name="cAddress"
                      required
                      placeholder="e.g. Flat 302, Sai Residency, Garkheda"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300">
                    💡 <strong>Payment Policy:</strong> Pay directly to worker via cash or UPI only after work inspection is complete.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition-colors"
                  >
                    {t.confirmBooking}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: LIVE REAL-TIME WORKER MAP TRACKING */}
          {trackingBooking && (
            <LiveTrackingModal
              booking={trackingBooking}
              onClose={() => setTrackingBooking(null)}
              onOpenReview={(w, bId, cName) => handleOpenReview(w, bId, cName)}
              onOpenPayment={(b) => setPaymentBooking(b)}
              t={t}
              lang={lang}
            />
          )}

          {/* MODAL: QUICK IN-APP CHAT */}
          {chatWorker && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full h-[520px] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-sm">
                      {SKILLS[chatWorker.skill]?.icon}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm">{chatWorker.name}</h4>
                      <span className="text-[11px] text-emerald-500 font-medium">● Online & Ready</span>
                    </div>
                  </div>
                  <button onClick={() => setChatWorker(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
                </div>

                {/* Message Thread */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50 dark:bg-slate-900/60">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      End-to-end direct coordination
                    </span>
                  </div>

                  {(chatMessages[chatWorker.id] || [
                    { sender: "worker", text: `Namaste! I am ${chatWorker.name}. Please share your exact landmark or issue details.`, time: "Just now" }
                  ]).map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                          msg.sender === "user"
                            ? "bg-amber-400 text-slate-950 font-medium rounded-br-none"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={currentChatInput}
                    onChange={(e) => setCurrentChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat(chatWorker.id)}
                    placeholder={t.typeMessage}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleSendChat(chatWorker.id)}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
                  >
                    {t.send}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: CUSTOMER REVIEW & RATING */}
          {reviewTarget && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49] p-6">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                      {t.reviewModalTitle} {reviewTarget.worker?.name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {SKILLS[reviewTarget.worker?.skill]?.en} • Aurangabad
                    </div>
                  </div>
                  <button onClick={() => setReviewTarget(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  
                  {/* Interactive Star Picker */}
                  <div className="text-center py-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {t.selectRating}
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating || ratingStars) >= star;
                        return (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingStars(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="text-3xl transition-transform hover:scale-125 focus:outline-none"
                          >
                            <span className={isFilled ? "text-amber-400" : "text-slate-300 dark:text-slate-700"}>
                              ★
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-amber-500">
                      {t.ratingLabels[hoverRating || ratingStars]}
                    </div>
                  </div>

                  {/* Reviewer Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.reviewerNameLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Ramesh P."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Feedback Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.reviewCommentLabel}
                    </label>
                    <textarea
                      rows="3"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={t.reviewCommentPlaceholder}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                    ></textarea>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-colors"
                  >
                    ★ {t.submitReviewBtn}
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* MODAL: WORKER DUTY SWITCH */}
          {showDutyModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49] p-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xl shadow-inner">
                      ⚡
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                        {t.dutyModalTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {t.dutyModalSubtitle}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowDutyModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">×</button>
                </div>

                {/* Worker Selector */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {t.selectWorkerProfile}
                  </label>
                  <select
                    value={selectedDutyWorkerId}
                    onChange={(e) => setSelectedDutyWorkerId(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400"
                  >
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({SKILLS[w.skill]?.en || w.skill}) - {w.area}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Status Cards */}
                {(() => {
                  const activeWorker = workers.find(w => w.id === selectedDutyWorkerId) || workers[0];
                  const currentAvail = activeWorker?.avail || "now";

                  return (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t.dutyStatusLabel}
                      </div>

                      {/* Online Option */}
                      <div
                        onClick={() => handleUpdateWorkerDuty(activeWorker.id, "now")}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                          currentAvail === "now"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-2 ring-emerald-400/30"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex-none mt-0.5 flex items-center justify-center text-white text-[10px] font-bold">
                          {currentAvail === "now" ? "✓" : ""}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {t.dutyOnline}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {t.dutyOnlineDesc}
                          </p>
                        </div>
                      </div>

                      {/* Busy Option */}
                      <div
                        onClick={() => handleUpdateWorkerDuty(activeWorker.id, "busy")}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                          currentAvail === "busy"
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-2 ring-amber-400/30"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex-none mt-0.5 flex items-center justify-center text-white text-[10px] font-bold">
                          {currentAvail === "busy" ? "✓" : ""}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {t.dutyBusy}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {t.dutyBusyDesc}
                          </p>
                        </div>
                      </div>

                      {/* Offline Option */}
                      <div
                        onClick={() => handleUpdateWorkerDuty(activeWorker.id, "week")}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                          currentAvail === "week"
                            ? "bg-slate-200 dark:bg-slate-800 border-slate-500 shadow-sm ring-2 ring-slate-400/30"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-slate-400 flex-none mt-0.5 flex items-center justify-center text-white text-[10px] font-bold">
                          {currentAvail === "week" ? "✓" : ""}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            {t.dutyOffline}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {t.dutyOfflineDesc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => setShowDutyModal(false)}
                  className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Close & Save Shift
                </button>

              </div>
            </div>
          )}

          {/* MODAL: UPI PAYMENT & DIGITAL TAX INVOICE */}
          {paymentBooking && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-md">
                      ₹
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                        {t.invoiceModalTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.invoiceSubtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentBooking(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center text-lg transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Printable Invoice Container */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 print:p-0" id="tax-invoice-receipt">
                  
                  {/* Status Banner */}
                  {paymentBooking.status === "paid" ? (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-base flex-none">
                        ✓
                      </div>
                      <div className="flex-1">
                        <div className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300">
                          Payment Settled & Confirmed
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Paid to {paymentBooking.workerName} • Time: {paymentBooking.paidAt || "Confirmed"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                          Total Amount Due
                        </div>
                        <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                          ₹{paymentBooking.estimatedAmt || 550}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold text-[10px] rounded-full uppercase tracking-wider animate-pulse">
                        Pending Payment
                      </span>
                    </div>
                  )}

                  {/* QR Code Section */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      📲 {t.scanToPay}
                    </div>

                    <div className="inline-block p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `upi://pay?pa=kaamsetu.${paymentBooking.workerPhone}@upi&pn=${encodeURIComponent(paymentBooking.workerName)}&am=${paymentBooking.estimatedAmt || 550}&cu=INR&tn=${encodeURIComponent('KaamSetu-' + paymentBooking.id)}`
                        )}`}
                        alt="UPI QR Code"
                        className="w-40 h-40 mx-auto block"
                        onError={(e) => {
                          (e.currentTarget as any).style.display = 'none';
                          if (((e.currentTarget as any).nextSibling as any)) ((e.currentTarget as any).nextSibling as any).style.display = 'flex';
                        }}
                      />
                      <div style={{ display: 'none' }} className="w-40 h-40 items-center justify-center bg-slate-100 rounded-xl text-center text-xs p-2">
                        <span>UPI: kaamsetu.{paymentBooking.workerPhone}@upi</span>
                      </div>
                    </div>

                    <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                      VPA: <code className="font-mono font-bold text-slate-800 dark:text-slate-200">kaamsetu.{paymentBooking.workerPhone}@upi</code>
                    </div>

                    {/* Quick App Launch Buttons for Mobile */}
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                      <a
                        href={`upi://pay?pa=kaamsetu.${paymentBooking.workerPhone}@upi&pn=${encodeURIComponent(paymentBooking.workerName)}&am=${paymentBooking.estimatedAmt || 550}&cu=INR&tn=${encodeURIComponent('KaamSetu-' + paymentBooking.id)}`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                      >
                        ⚡ Google Pay
                      </a>
                      <a
                        href={`upi://pay?pa=kaamsetu.${paymentBooking.workerPhone}@upi&pn=${encodeURIComponent(paymentBooking.workerName)}&am=${paymentBooking.estimatedAmt || 550}&cu=INR&tn=${encodeURIComponent('KaamSetu-' + paymentBooking.id)}`}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                      >
                        ⚡ PhonePe
                      </a>
                      <a
                        href={`upi://pay?pa=kaamsetu.${paymentBooking.workerPhone}@upi&pn=${encodeURIComponent(paymentBooking.workerName)}&am=${paymentBooking.estimatedAmt || 550}&cu=INR&tn=${encodeURIComponent('KaamSetu-' + paymentBooking.id)}`}
                        className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                      >
                        ⚡ Paytm / BHIM
                      </a>
                    </div>
                  </div>

                  {/* Tax Invoice Breakdown Receipt */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-white dark:bg-[#1a2c36]">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                          Kaam<span className="text-amber-500">Setu</span> Digital Tax Invoice
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.invoiceNumber}: #KS-INV-2026-{paymentBooking.id}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                        <div>Date: {paymentBooking.date}</div>
                        <div>Slot: {paymentBooking.slot}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.billedTo}</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{paymentBooking.customerName}</div>
                        <div className="text-slate-500 text-[11px]">{paymentBooking.customerPhone}</div>
                        <div className="text-slate-500 text-[11px] line-clamp-1">{paymentBooking.customerAddress}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.servicePartner}</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{paymentBooking.workerName}</div>
                        <div className="text-slate-500 text-[11px] capitalize">{paymentBooking.workerSkill} • {paymentBooking.workerArea}</div>
                        <div className="text-slate-500 text-[11px]">Phone: +91 {paymentBooking.workerPhone}</div>
                      </div>
                    </div>

                    {/* Breakdown Line Items */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>{t.visitingCharge}</span>
                        <span className="font-semibold">₹150</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>{t.laborCharge}</span>
                        <span className="font-semibold">₹{Math.max(100, (paymentBooking.estimatedAmt || 550) - 150)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>{t.platformConvenienceFee}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{t.feeFree}</span>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                        <span>{t.totalPayable}</span>
                        <span className="text-amber-500 font-display text-base">₹{paymentBooking.estimatedAmt || 550}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 italic pt-1 text-center">
                      * GST Exempt under local artisan service threshold. Direct peer-to-peer settlement verified by KaamSetu Technologies.
                    </div>
                  </div>

                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3">
                  {paymentBooking.status !== "paid" ? (
                    <button
                      onClick={() => handleMarkPaid(paymentBooking.id)}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <span>✓</span> {t.markAsPaidBtn}
                    </button>
                  ) : (
                    <div className="flex-1 py-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl text-center">
                      ✓ Paid via UPI / Direct Settlement
                    </div>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <span>🖨️</span> {t.printInvoiceBtn}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* MODAL: WORKER PAYOUT STATEMENT & LEDGER */}
          {selectedLedgerWorker && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xl shadow-md">
                      {SKILLS[selectedLedgerWorker.worker.skill]?.icon || "🔧"}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                        {selectedLedgerWorker.worker.name} • {t.ledgerModalTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {selectedLedgerWorker.worker.skill} • {selectedLedgerWorker.worker.area} • Ph: {selectedLedgerWorker.worker.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLedgerWorker(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg hover:bg-slate-200 transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                  
                  {/* Account Financial Overview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Value</span>
                      <span className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                        ₹{selectedLedgerWorker.totalGross.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-amber-500 uppercase font-bold block">Tips</span>
                      <span className="font-display font-extrabold text-base text-amber-500">
                        +₹{selectedLedgerWorker.tips.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Disbursed</span>
                      <span className="font-display font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                        ₹{selectedLedgerWorker.settledAmt.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-center">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold block">Pending Due</span>
                      <span className="font-display font-extrabold text-base text-rose-600 dark:text-rose-400">
                        ₹{selectedLedgerWorker.pendingBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Banking & UPI Settlement Channel */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>🏦 {t.bankAccountDetails}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">KYC Verified ✓</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block">UPI Virtual Payment Address (VPA):</span>
                        <code className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 block mt-0.5">
                          {selectedLedgerWorker.upiId}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Primary Settlement Account:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                          {selectedLedgerWorker.bankDetails}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Settlement History Log */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                      <span>📋</span> {t.payoutHistoryTitle}
                    </h4>

                    {selectedLedgerWorker.history.length === 0 ? (
                      <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                        {t.noPayoutHistory}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedLedgerWorker.history.map((tx, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white dark:bg-[#1a2c36] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shadow-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                                ✓
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  ₹{tx.amount.toLocaleString()} Disbursed
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Ref: {tx.txRef} • {tx.mode || "Instant UPI"}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {tx.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                  {selectedLedgerWorker.pendingBalance > 0 ? (
                    <button
                      onClick={() => {
                        handleDisbursePayout(selectedLedgerWorker.worker.id, selectedLedgerWorker.pendingBalance);
                        setSelectedLedgerWorker(null);
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>⚡</span> Settle Balance (₹{selectedLedgerWorker.pendingBalance.toLocaleString()}) Now
                    </button>
                  ) : (
                    <div className="flex-1 py-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl text-center">
                      ✓ All Dues Up-to-Date & Cleared
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedLedgerWorker(null)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                  >
                    {t.closeModal}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* MODAL: SMART DIAGNOSTIC & COST ESTIMATOR WIZARD */}
          {showEstimatorModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
                      🧮
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                        {t.estimatorTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.estimatorSubtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEstimatorModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg hover:bg-slate-200 transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Wizard Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                  
                  {/* Step 1: Trade Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {t.stepSelectTrade}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.entries(SKILLS).map(([k, s]) => (
                        <button
                          key={k}
                          onClick={() => {
                            setEstimatorTrade(k);
                            setSelectedIssueIndex(0);
                          }}
                          className={`p-2.5 rounded-2xl text-center border transition-all ${
                            estimatorTrade === k
                              ? "bg-amber-400 text-slate-950 font-bold border-amber-400 shadow-sm ring-2 ring-amber-400/40"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="text-xl mb-1">{s.icon}</div>
                          <div className="text-[11px] font-semibold truncate">{lang === "en" ? s.en : s.mr}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Specific Issue / Problem */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {t.stepSelectIssue}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(DIAGNOSTIC_ISSUES[estimatorTrade] || []).map((issue, idx) => {
                        const isSelected = selectedIssueIndex === idx;
                        return (
                          <div
                            key={issue.id}
                            onClick={() => setSelectedIssueIndex(idx)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected
                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-2 ring-amber-400/30"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-2xl mt-0.5">{issue.icon}</span>
                            <div className="flex-1">
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {lang === "en" ? issue.titleEn : issue.titleMr}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                {lang === "en" ? issue.descEn : issue.descMr}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                                <span>⏱️ {issue.duration}</span>
                                <span>•</span>
                                <span>Labor: ₹{issue.labor}</span>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full mt-0.5 flex-none flex items-center justify-center text-[10px] ${
                              isSelected ? "bg-amber-500 text-white font-bold" : "border border-slate-300"
                            }`}>
                              {isSelected ? "✓" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Urgency Options & Locality */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        {t.stepUrgency}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEstimatorUrgency("normal")}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            estimatorUrgency === "normal"
                              ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 border-transparent shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          🕒 {t.urgencyNormal}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEstimatorUrgency("emergency")}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            estimatorUrgency === "emergency"
                              ? "bg-rose-500 text-white border-rose-500 shadow-sm animate-pulse"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          ⚡ {t.urgencyEmergency}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        📍 {t.localityLabel}
                      </label>
                      <select
                        value={estimatorLocality}
                        onChange={(e) => setEstimatorLocality(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-400"
                      >
                        {LOCALITIES.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calculated Cost Breakdown Output Card */}
                  {(() => {
                    const issues = DIAGNOSTIC_ISSUES[estimatorTrade] || [];
                    const issue = issues[selectedIssueIndex] || issues[0] || { labor: 350, parts: 150, duration: "1 hr" };
                    const emergencyExtra = estimatorUrgency === "emergency" ? 120 : 0;
                    const baseVisit = 100;
                    const totalLabor = issue.labor + baseVisit + emergencyExtra;
                    const totalMin = totalLabor + issue.parts;
                    const totalMax = totalLabor + issue.parts + 150;

                    return (
                      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900/90 dark:to-amber-950/30 rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 shadow-inner space-y-3">
                        <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-2.5">
                          <div>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black tracking-wider block">
                              Diagnostic Estimate Result
                            </span>
                            <div className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                              {lang === "en" ? issue.titleEn : issue.titleMr}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.estDuration}</span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">⏱️ {issue.duration}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-amber-200/50 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block">{t.estLaborCost}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">₹{totalLabor}</span>
                          </div>
                          <div className="p-2 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-amber-200/50 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block">{t.estPartsCost}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">₹{issue.parts}</span>
                          </div>
                          <div className="p-2 bg-amber-400/20 dark:bg-amber-400/10 rounded-xl border border-amber-400/50">
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">{t.estTotalRange}</span>
                            <span className="font-display font-extrabold text-sm text-amber-600 dark:text-amber-400">
                              ₹{totalMin} - ₹{totalMax}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Top Matched Specialists in Aurangabad */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2.5 flex items-center justify-between">
                      <span>👷 {t.matchingPros}</span>
                      <span className="text-slate-400 text-[11px] font-normal">in {estimatorLocality} & nearby</span>
                    </h4>

                    {(() => {
                      const matched = workers.filter(w => w.skill === estimatorTrade);
                      const issues = DIAGNOSTIC_ISSUES[estimatorTrade] || [];
                      const issue = issues[selectedIssueIndex] || issues[0];
                      const jobNote = `${lang === "en" ? issue?.titleEn : issue?.titleMr} (Est. ${issue?.duration})`;

                      return (
                        <div className="space-y-2">
                          {matched.slice(0, 3).map(w => (
                            <div
                              key={w.id}
                              className="p-3 bg-white dark:bg-[#1a2c36] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm hover:border-amber-400 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm flex-none">
                                  {SKILLS[w.skill]?.icon}
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{lang === "en" ? w.name : (w.nameMr || w.name)}</span>
                                    <span className="text-amber-500 font-semibold text-[11px]">★ {w.rating}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {w.area} • ₹{w.visit} visit • ₹{w.rate}/hr
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setShowEstimatorModal(false);
                                  setBookingWorker({ ...w, customJobNote: jobNote });
                                }}
                                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1 flex-none"
                              >
                                <span>⚡</span> {t.bookNow}
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end">
                  <button
                    onClick={() => setShowEstimatorModal(false)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Done & Close
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* MODAL: PWA INSTALL GUIDE */}
          {showInstallModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a2c36] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-[#293d49] p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 text-3xl font-extrabold flex items-center justify-center mx-auto mb-4 shadow-md">
                  ⚡
                </div>
                <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                  {t.installGuideTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
                  {t.installGuideSub}
                </p>

                <div className="space-y-3 text-left text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-1">
                      <span>🤖</span> Android / Chrome / Edge:
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Tap the browser menu <strong>(⋮)</strong> and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-1">
                      <span>🍎</span> iPhone / iPad / Safari:
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Tap the <strong>Share</strong> button <strong>(⎋)</strong> at the bottom of Safari, then scroll down and tap <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInstallModal(false)}
                  className="mt-6 w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Got It!
                </button>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-xl text-white">
                  Kaam<span className="text-amber-400">Setu</span>
                </span>
                <span>•</span>
                <span>Bridging Skilled Hands with Everyday Needs</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("admin")}
                  className="text-amber-400 hover:underline font-semibold flex items-center gap-1"
                >
                  🛡️ {t.navAdmin}
                </button>
                <span>•</span>
                <span>© 2026 KaamSetu Technologies</span>
                <span>•</span>
                <span>Aurangabad, MH</span>
              </div>
            </div>
          </footer>

        </div>
      );
    }

    // --- SUB-COMPONENT: ANIMATED LIVE ROUTE TRACKER ---
