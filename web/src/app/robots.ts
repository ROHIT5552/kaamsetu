import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kaamsetu.in';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/*/admin', '/*/worker/dashboard', '/*/account'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
