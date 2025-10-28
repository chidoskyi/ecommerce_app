import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({ 
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'production',

  runtimeCaching: [
    // Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60
        }
      }
    },

    // Cloudinary Images
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60
        }
      }
    },

    // Local Fonts
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60
        }
      }
    },

    // Product Images
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60
        }
      }
    },

    // Next.js Optimized Images
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60
        }
      }
    },

    // Audio/Video
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-audio-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-video-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },

    // JavaScript
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 48,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },

    // CSS
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },

    // Next.js Data
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60
        },
        networkTimeoutSeconds: 3
      }
    },

    // Product APIs
    {
      urlPattern: /\/api\/products.*$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'products-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60
        },
        networkTimeoutSeconds: 5
      }
    },

    // Cart/Checkout APIs (no caching)
    {
      urlPattern: /\/api\/(cart|checkout|orders).*$/i,
      handler: 'NetworkOnly',
      method: 'GET'
    },

    // Other API routes
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'apis',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 10 * 60
        },
        networkTimeoutSeconds: 5
      }
    },

    // Catch-all
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        },
        networkTimeoutSeconds: 10
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // turbopack: {
  //   root: "/Users/NETPHIX_DEV/Desktop/ecommerce_app",
  // },
  env: {
    NEXT_PUBLIC_BANK_ONE_NAME: process.env.NEXT_PUBLIC_BANK_ONE_NAME,
    NEXT_PUBLIC_BANK_ONE_ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NAME,
    NEXT_PUBLIC_BANK_ONE_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NUMBER,
    NEXT_PUBLIC_BANK_TWO_NAME: process.env.NEXT_PUBLIC_BANK_TWO_NAME,
    NEXT_PUBLIC_BANK_TWO_ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NAME,
    NEXT_PUBLIC_BANK_TWO_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NUMBER,
  },
};

export default withPWA(nextConfig); 