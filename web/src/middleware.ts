import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  // Match only internationalized pathnames, ignore api, _next, static assets
  matcher: ['/', '/(mr|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
