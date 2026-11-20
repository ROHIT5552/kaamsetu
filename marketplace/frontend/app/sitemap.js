export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kaamsetu-dun.vercel.app';
  const lastModified = new Date();

  const routes = [
    '',
    '/#find',
    '/#emergency',
    '/#bookings',
    '/#join',
    '/#admin',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  const trades = ['plumber', 'electrician', 'carpenter', 'painter', 'mason', 'helper'].map((trade) => ({
    url: `${baseUrl}/?trade=${trade}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const localities = ['cidco', 'garkheda', 'osmanpura', 'beed-bypass', 'hudco', 'waluj'].map((loc) => ({
    url: `${baseUrl}/?area=${loc}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...routes, ...trades, ...localities];
}
