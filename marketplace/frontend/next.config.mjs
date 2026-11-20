import { fileURLToPath } from 'node:url';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

function backendOrigin(phase) {
  const supplied = process.env.SWABHIMAN_API_ORIGIN;
  if (!supplied) {
    if (phase === PHASE_DEVELOPMENT_SERVER) return 'http://127.0.0.1:3001';
    return 'https://kaamsetu.onrender.com';
  }
  try {
    const url = new URL(supplied);
    return url.origin;
  } catch {
    return 'https://kaamsetu.onrender.com';
  }
}

export default (phase) => ({
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  poweredByHeader: false,
  devIndicators: false,
  async rewrites() {
    const origin = backendOrigin(phase);
    return [
      { source: '/api/:path*', destination: `${origin}/api/:path*` }
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
});
