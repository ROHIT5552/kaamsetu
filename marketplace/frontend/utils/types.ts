/**
 * SWABHIMAN (स्वाभिमान) Domain Types & Interfaces
 * Hyper-local marketplace connecting households with verified local tradespeople.
 */

export type TradeType = 'plumber' | 'electrician' | 'carpenter' | 'painter' | 'mason' | 'helper';

export type AvailabilityStatus = 'now' | 'today' | 'week' | 'busy' | 'offline';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastNotification {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

export interface ReviewItem {
  user: string;
  text: string;
  rating: number;
  date: string;
}

export interface WorkerProfile {
  id: number;
  name: string;
  nameMr?: string;
  skill: TradeType | string;
  exp: number;
  area: string;
  rating: number;
  jobs: number;
  rate: number;
  visit: number;
  phone: string;
  avail: AvailabilityStatus | string;
  verified: boolean;
  status?: 'approved' | 'pending' | 'rejected' | string;
  bio: string;
  bioMr?: string;
  tools?: string[];
  photos?: string[];
  reviews?: ReviewItem[];
  workSamples?: string[];
}

export interface BookingRecord {
  id: number;
  workerId: number;
  workerName: string;
  workerSkill: string;
  workerArea: string;
  workerPhone: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  slot: string;
  jobNote?: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'paid' | 'cancelled' | string;
  estimatedAmt: number;
  paidAt?: string;
  reviewed?: boolean;
  userRating?: number;
  createdAt: string;
}

export interface DiagnosticIssue {
  title: string;
  titleMr: string;
  time: string;
  parts: string;
  labor: number;
  urgency: 'high' | 'normal';
}

export interface PayoutHistoryItem {
  date: string;
  amount: number;
  txRef: string;
  mode: string;
}

export interface WorkerPayoutState {
  settledAmt: number;
  lastPayoutDate?: string;
  lastTxRef?: string;
  history: PayoutHistoryItem[];
}

export interface LedgerItem {
  worker: WorkerProfile;
  completedCount: number;
  totalGross: number;
  tips: number;
  commission: number;
  netEarnings: number;
  settledAmt: number;
  pendingBalance: number;
  isSettled: boolean;
  upiId: string;
  bankDetails: string;
  lastPayoutDate: string;
  lastTxRef: string;
  history: PayoutHistoryItem[];
}

export interface PlatformStats {
  totalWorkers: number;
  verifiedWorkers: number;
  pendingKYC: number;
  activeLocalities: number;
  totalBookings: number;
  completedJobs: number;
  grossServiceVolumeINR: number;
  totalDisbursedINR: number;
  pendingDisbursalsINR: number;
  customerSatisfaction: number;
  city: string;
}
