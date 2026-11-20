export type TradeType = 'plumber' | 'electrician' | 'carpenter' | 'painter' | 'mason' | 'helper';

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
  avail: string;
  verified: boolean;
  status: string;
  bio: string;
  bioMr?: string;
  tools?: string[];
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
  status: string;
  estimatedAmt: number;
  createdAt: string;
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
  uptimeSeconds: number;
  timestamp: string;
}
