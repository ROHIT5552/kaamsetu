import { fileURLToPath } from 'node:url';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';
function backendOrigin(phase) {
  const supplied=process.env.SWABHIMAN_API_ORIGIN;
  if (!supplied && phase===PHASE_DEVELOPMENT_SERVER) return 'http://127.0.0.1:3001';
  if (!supplied) throw new Error('Set SWABHIMAN_API_ORIGIN to the Render backend HTTPS origin.');
  const url=new URL(supplied);
  const local=['localhost','127.0.0.1'].includes(url.hostname);
  if ((url.protocol!=='https:' && !(url.protocol==='http:' && local && process.env.VERCEL!=='1')) ||
      url.username || url.password || url.pathname!=='/' || url.search || url.hash) {
    throw new Error('SWABHIMAN_API_ORIGIN must be an HTTPS origin or a local development origin.');
  }
  return url.origin;
}
export default phase => ({
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)), poweredByHeader: false,
  devIndicators: false,
  async rewrites() {
    const origin=backendOrigin(phase);
    return ['/api/health','/api/market'].map(source=>({source,destination:origin+source}));
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'same-origin'},
      {key:'Permissions-Policy',value:'geolocation=(self), camera=(), microphone=()'},
      {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'"+(phase===PHASE_DEVELOPMENT_SERVER?" 'unsafe-eval'":"")+"; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}
    ]}];
  }
});