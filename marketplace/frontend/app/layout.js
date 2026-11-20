import './style.css';

export const viewport = {
  themeColor: '#ffc21a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'KaamSetu (कामसेतू) – Skilled Local Workers on Demand & Admin Ops',
  description: 'On-demand local plumbers, electricians, carpenters, painters & helpers in Aurangabad / Chhatrapati Sambhajinagar.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#fffdf7] text-slate-800 antialiased min-h-screen selection:bg-amber-200">
        {children}
      </body>
    </html>
  );
}
