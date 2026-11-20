export * from './types';

/**
 * Format Indian Rupee currency with standard comma separators
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format raw number with Indian numbering grouping (e.g. 78,500)
 */
export function formatNumber(num: number): string {
  return (num || 0).toLocaleString('en-IN');
}

/**
 * Generate standard UPI deep-link URL (compatible with PhonePe, Google Pay, Paytm, BHIM)
 */
export function generateUpiUrl(params: {
  pa: string;
  pn: string;
  am: number;
  tn?: string;
}): string {
  const note = encodeURIComponent(params.tn || 'KaamSetu Service Fee');
  const payee = encodeURIComponent(params.pn);
  return `upi://pay?pa=${params.pa}&pn=${payee}&am=${params.am}&tn=${note}&cu=INR`;
}

/**
 * Mask mobile numbers for privacy (e.g. "9822***223")
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

/**
 * Generate unique settlement transaction reference
 */
export function generateTxRef(workerId: number | string): string {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `UPI-PAY-${workerId}-${random}`;
}
