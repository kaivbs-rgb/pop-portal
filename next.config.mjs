/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['postgres'],
  images: { remotePatterns: [{ protocol: 'https', hostname: 'kvb-power-os.b-cdn.net' }] },
};
export default nextConfig;
