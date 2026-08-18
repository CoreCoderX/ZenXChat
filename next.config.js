/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static export for Capacitor + GitHub Pages
  output: "export",

  // GitHub Pages project URL:
  // https://corecoderx.github.io/ZenXChat/
  basePath: "/ZenXChat",

  trailingSlash: true,

  images: {
    unoptimized: true,
  },

  experimental: {},
};

module.exports = nextConfig;
