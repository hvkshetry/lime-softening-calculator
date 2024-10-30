/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static exports
  basePath: '/lime-softening-calculator', // Match your repo name
  images: {
    unoptimized: true, // Required for static export
  },
  assetPrefix: './', // Necessary for GitHub Pages
}

module.exports = nextConfig
