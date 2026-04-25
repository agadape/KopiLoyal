/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { dev }) {
    // Disable filesystem cache — Windows Defender locks .next/cache files
    config.cache = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "react-native": false,
      "pino-pretty": false,
      "lokijs": false,
      "encoding": false,
    };
    return config;
  },
};

module.exports = nextConfig;
