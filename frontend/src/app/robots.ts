import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/profile/',
        '/settings/',
        '/api/',
      ],
    },
    sitemap: 'https://bloodrelay.netlify.app/sitemap.xml',
  };
}
