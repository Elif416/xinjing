const remotePatterns = [];

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (supabaseUrl) {
    const { protocol, hostname } = new URL(supabaseUrl);

    remotePatterns.push({
      protocol: protocol.replace(':', ''),
      hostname,
      pathname: '/storage/v1/**'
    });
  }
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24
  }
};

export default nextConfig;
