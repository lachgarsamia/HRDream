/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config) => {
    // Required for react-pdf to work properly
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
