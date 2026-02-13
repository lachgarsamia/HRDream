/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    return [
      { source: "/projects", destination: "/jobs", permanent: false },
      { source: "/upload", destination: "/jobs", permanent: false },
      { source: "/roles", destination: "/jobs", permanent: false },
      { source: "/runs", destination: "/jobs", permanent: false },
    ];
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
