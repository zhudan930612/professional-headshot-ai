import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
    title?: string;
    description?: string;
    canonicalPath?: string; // Override canonical path if needed
    noIndex?: boolean; // For pages that shouldn't be indexed
}

const BASE_URL = 'https://www.professionalheadshotai.ink';

// Default SEO configuration for each route
const SEO_CONFIG: Record<string, { title: string; description: string }> = {
    '/': {
        title: 'Professional Headshot AI – Headshots That Look Like You',
        description: 'Create realistic AI professional headshots that actually look like you. Upload photos, choose a style, and get studio-quality results in minutes.'
    },
    '/pricing': {
        title: 'Pricing – Professional Headshot AI',
        description: 'Affordable AI headshot packages. Get 5 free generations on signup. No credit card required. Premium plans for unlimited professional headshots.'
    },
    '/faq': {
        title: 'FAQ – Professional Headshot AI',
        description: 'Frequently asked questions about AI professional headshots. Learn how it works, photo requirements, delivery time, and more.'
    },
    '/blog': {
        title: 'Blog – Professional Headshot AI',
        description: 'Tips, guides, and insights about professional headshots, career branding, and AI photography technology.'
    },
    '/terms': {
        title: 'Terms of Service – Professional Headshot AI',
        description: 'Terms and conditions for using Professional Headshot AI services.'
    },
    '/privacy': {
        title: 'Privacy Policy – Professional Headshot AI',
        description: 'How we collect, use, and protect your personal information at Professional Headshot AI.'
    },
    '/history': {
        title: 'My History – Professional Headshot AI',
        description: 'View and manage your generated AI headshots.'
    },
    '/subscription': {
        title: 'My Subscription – Professional Headshot AI',
        description: 'Manage your Professional Headshot AI subscription and credits.'
    }
};

export const SEOHead: React.FC<SEOHeadProps> = ({
    title,
    description,
    canonicalPath,
    noIndex = false
}) => {
    const location = useLocation();
    const currentPath = location.pathname;

    useEffect(() => {
        // Get default config or use provided values
        const defaultConfig = SEO_CONFIG[currentPath] || SEO_CONFIG['/'];
        const finalTitle = title || defaultConfig.title;
        const finalDescription = description || defaultConfig.description;

        // Determine canonical URL
        // For blog posts, use the current path; for other pages, use the defined path
        const canonicalUrl = `${BASE_URL}${canonicalPath || currentPath}`;

        // Update document title
        document.title = finalTitle;

        // Helper function to update or create meta tag
        const updateMetaTag = (name: string, content: string, isProperty = false) => {
            const attribute = isProperty ? 'property' : 'name';
            let tag = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
            if (tag) {
                tag.setAttribute('content', content);
            } else {
                tag = document.createElement('meta');
                tag.setAttribute(attribute, name);
                tag.setAttribute('content', content);
                document.head.appendChild(tag);
            }
        };

        // Update meta description
        updateMetaTag('description', finalDescription);

        // Update canonical link
        let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (canonicalLink) {
            canonicalLink.setAttribute('href', canonicalUrl);
        } else {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            canonicalLink.setAttribute('href', canonicalUrl);
            document.head.appendChild(canonicalLink);
        }

        // Handle noindex for private pages
        let robotsTag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
        if (noIndex) {
            if (robotsTag) {
                robotsTag.setAttribute('content', 'noindex, nofollow');
            } else {
                robotsTag = document.createElement('meta');
                robotsTag.setAttribute('name', 'robots');
                robotsTag.setAttribute('content', 'noindex, nofollow');
                document.head.appendChild(robotsTag);
            }
        } else {
            // Remove noindex if it exists
            if (robotsTag) {
                robotsTag.remove();
            }
        }

        // Open Graph tags for social sharing
        updateMetaTag('og:title', finalTitle, true);
        updateMetaTag('og:description', finalDescription, true);
        updateMetaTag('og:url', canonicalUrl, true);
        updateMetaTag('og:type', 'website', true);

        // Twitter Card tags
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', finalTitle);
        updateMetaTag('twitter:description', finalDescription);

        // Cleanup function - reset to default when unmounting
        return () => {
            // Optional: reset to home page defaults or leave as-is for SPA
        };
    }, [currentPath, title, description, canonicalPath, noIndex]);

    return null; // This component only manages head tags, doesn't render anything
};
