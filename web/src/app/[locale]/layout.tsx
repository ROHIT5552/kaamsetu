import type { Metadata } from 'next';
import { Baloo_2, Hind } from 'next/font/google';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Header from '@/components/Header';
import Toast from '@/components/Toast';
import AuthModal from '@/components/AuthModal';
import WorkerDialog from '@/components/WorkerDialog';
import BookingDialog from '@/components/BookingDialog';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

const baloo = Baloo_2({
  subsets: ['latin', 'devanagari'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-baloo',
  display: 'swap',
});

const hind = Hind({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KaamSetu – Skilled Local Workers for Small Jobs in Aurangabad',
  description:
    'Find and book verified local plumbers, electricians, carpenters, painters, masons, and helpers across Aurangabad (Chhatrapati Sambhajinagar). Compare work photos, ratings, and daily rates.',
  keywords: [
    'Aurangabad workers',
    'Chhatrapati Sambhajinagar skilled labor',
    'plumber in Aurangabad',
    'electrician in Jalna road',
    'carpenter Osmanpura',
    'painter Garkheda',
    'mason Beed bypass',
    'KaamSetu',
  ],
  authors: [{ name: 'KaamSetu' }],
  metadataBase: new URL('https://kaamsetu.in'),
  openGraph: {
    title: 'KaamSetu – Verified Skilled Workers in Aurangabad',
    description:
      'Compare real work photos, ratings, and upfront daily rates. Book a slot or call directly with zero middleman commissions.',
    url: 'https://kaamsetu.in',
    siteName: 'KaamSetu',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KaamSetu – Skilled Workers for Small Jobs in Aurangabad',
    description:
      'Find verified plumbers, electricians, carpenters, and painters in Aurangabad.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = (await getMessages()) as any;

  // JSON-LD Structured Data Schema for LocalBusiness Marketplace
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'KaamSetu',
    description:
      'Marketplace to find verified local skilled workers for small jobs in Aurangabad.',
    url: 'https://kaamsetu.in',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Aurangabad (Chhatrapati Sambhajinagar)',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '19.8762',
      longitude: '75.3433',
    },
    priceRange: '₹400 - ₹1000',
    openingHours: 'Mo,Tu,We,Th,Fr,Sa,Su 08:00-20:00',
    areaServed: [
      'CIDCO N-3',
      'Garkheda',
      'Osmanpura',
      'Jalna Road',
      'Beed Bypass',
      'Samarth Nagar',
      'Waluj',
      'Harsul',
    ],
  };

  return (
    <html lang={locale} className={`${baloo.variable} ${hind.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg text-ink transition-colors duration-200">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header
            locale={locale}
            t={{
              find: messages.find,
              join: messages.join,
              login: messages.login,
              account: messages.account,
              dashboard: messages.dashboard,
              admin: messages.admin,
              logout: messages.logout,
            }}
          />

          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-ink text-white/80 py-8 border-t border-line/20 text-xs">
            <div className="max-w-[1100px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-baloo font-bold text-lg text-white">Kaam<b className="text-yel">Setu</b></span>
                <span>© {new Date().getFullYear()} KaamSetu Technologies. Aurangabad, MH.</span>
              </div>
              <div className="flex items-center gap-4 text-white/60">
                <span>CIDCO</span>
                <span>·</span>
                <span>Garkheda</span>
                <span>·</span>
                <span>Osmanpura</span>
                <span>·</span>
                <span>Jalna Road</span>
                <span>·</span>
                <span>Waluj</span>
              </div>
            </div>
          </footer>

          {/* Interactive Global Modals */}
          <Toast />
          <AuthModal
            t={{
              authModalTitle: messages.authModalTitle,
              phoneTab: messages.phoneTab,
              emailTab: messages.emailTab,
              phonePlaceholder: messages.phonePlaceholder,
              emailPlaceholder: messages.emailPlaceholder,
              namePlaceholder: messages.namePlaceholder,
              sendOtp: messages.sendOtp,
              verifyOtp: messages.verifyOtp,
              enterOtp: messages.enterOtp,
              resendOtp: messages.resendOtp,
              privacyConsent: messages.privacyConsent,
            }}
          />
          <WorkerDialog
            locale={locale}
            t={{
              yrs: messages.yrs,
              jobs: messages.jobs,
              ver: messages.ver,
              unv: messages.unv,
              about: messages.about,
              work: messages.work,
              rev: messages.rev,
              book: messages.book,
              call: messages.call,
              sample: messages.sample,
              signInToCall: messages.signInToCall,
            }}
          />
          <BookingDialog
            locale={locale}
            t={{
              bT: messages.bT,
              bDate: messages.bDate,
              bSlot: messages.bSlot,
              bName: messages.bName,
              bPhone: messages.bPhone,
              bJob: messages.bJob,
              bSend: messages.bSend,
              bOk: messages.bOk,
              slots: messages.slots,
              trk: messages.trk,
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
