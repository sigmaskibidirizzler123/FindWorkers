import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/employer/dashboard/', '/candidate/profile/'], // Hide private pages
        },
        sitemap: 'https://findworkers.vn/sitemap.xml', // Change domain later
    };
}
