// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

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
  env: {
    // Bank One Details
    NEXT_PUBLIC_BANK_ONE_NAME: process.env.NEXT_PUBLIC_BANK_ONE_NAME,
    NEXT_PUBLIC_BANK_ONE_ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NAME,
    NEXT_PUBLIC_BANK_ONE_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NUMBER,
    
    // Bank Two Details
    NEXT_PUBLIC_BANK_TWO_NAME: process.env.NEXT_PUBLIC_BANK_TWO_NAME,
    NEXT_PUBLIC_BANK_TWO_ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NAME,
    NEXT_PUBLIC_BANK_TWO_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NUMBER,
  },
};

module.exports = nextConfig;
