import './style.css';

export const viewport = {
  themeColor: '#ffc21a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kaamsetu-dun.vercel.app';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SWABHIMAN (स्वाभिमान) – Verified Local Skilled Workers & Small Jobs',
    template: '%s | SWABHIMAN Chhatrapati Sambhajinagar',
  },
  description:
    'On-demand hyper-local marketplace connecting households and businesses with verified skilled workers: plumbers, electricians, carpenters, painters, masons, and helpers across Chhatrapati Sambhajinagar (Aurangabad). Direct contacts, upfront rates, zero middleman markups.',
  keywords: [
    'SWABHIMAN',
    'स्वाभिमान',
    'plumber Aurangabad',
    'electrician Chhatrapati Sambhajinagar',
    'carpenter Sambhajinagar',
    'home repair services',
    'local skilled workers',
    'daily wage helpers',
    'painter CIDCO',
    'verified technicians',
    'emergency plumber Aurangabad',
  ],
  authors: [{ name: 'SWABHIMAN Team' }],
  creator: 'SWABHIMAN',
  publisher: 'SWABHIMAN Platform',
  alternates: {
    canonical: '/',
    languages: {
      'en-IN': '/',
      'mr-IN': '/?lang=mr',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    alternateLocale: ['mr_IN'],
    url: siteUrl,
    title: 'SWABHIMAN (स्वाभिमान) – Skilled Local Workers on Demand',
    description:
      'Connect directly with verified local tradespeople in Chhatrapati Sambhajinagar. Upfront visiting charges, fair hourly rates, and 1-click WhatsApp/Call bookings.',
    siteName: 'SWABHIMAN',
    images: [
      {
        url: '/swabhiman-logo.png',
        width: 1200,
        height: 400,
        alt: 'SWABHIMAN Logo - Verified Local Tradespeople',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SWABHIMAN (स्वाभिमान) – Local Skilled Workers on Demand',
    description:
      'Verified plumbers, electricians, carpenters, and helpers in Chhatrapati Sambhajinagar. Direct contact, zero commissions.',
    images: ['/swabhiman-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icons/icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LocalBusiness',
      '@id': `${siteUrl}/#organization`,
      name: 'SWABHIMAN (स्वाभिमान)',
      url: siteUrl,
      logo: `${siteUrl}/swabhiman-logo.png`,
      description:
        'Hyper-local marketplace connecting households with verified local tradespeople in Chhatrapati Sambhajinagar.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Chhatrapati Sambhajinagar',
        addressRegion: 'Maharashtra',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 19.8762,
        longitude: 75.3433,
      },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'Chhatrapati Sambhajinagar (Aurangabad)',
      },
      priceRange: '₹150 - ₹1500',
      currenciesAccepted: 'INR',
      paymentAccepted: 'Cash, UPI, PhonePe, Google Pay, Paytm',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'SWABHIMAN',
      inLanguage: ['en-IN', 'mr-IN'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SWABHIMAN" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#faf9f5] text-slate-900 antialiased min-h-screen selection:bg-amber-200">
        {children}
      </body>
    </html>
  );
}
