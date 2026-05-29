/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cover.nl.go.kr" },
      { protocol: "http", hostname: "cover.nl.go.kr" },
    ],
  },
};

export default nextConfig;
