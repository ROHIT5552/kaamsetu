import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'mr'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = locale && locales.includes(locale as any) ? locale : 'en';

  return {
    messages: (await import(`../messages/${currentLocale}.json`)).default,
  };
});
