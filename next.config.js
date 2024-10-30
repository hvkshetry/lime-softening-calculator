/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/lime-softening-calculator',
  images: {
    unoptimized: true,
  },
  assetPrefix: 'https://hvkshetry.github.io/lime-softening-calculator/'
}

module.exports = nextConfig
