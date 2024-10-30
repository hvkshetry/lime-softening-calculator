/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/lime-softening-calculator',
  images: {
    unoptimized: true,
  },
  assetPrefix: 'https://[your-username].github.io/lime-softening-calculator/'
}

module.exports = nextConfig
