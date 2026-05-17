import { existsSync, readFileSync } from 'node:fs';

const remotePatterns = [];

try {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    readLocalEnvValue('NEXT_PUBLIC_SUPABASE_URL');

  if (supabaseUrl) {
    const { protocol, hostname } = new URL(supabaseUrl);

    remotePatterns.push({
      protocol: protocol.replace(':', ''),
      hostname,
      pathname: '/storage/v1/**'
    });
  }
} catch {}

function readLocalEnvValue(key) {
  try {
    if (!existsSync('.env.local')) {
      return '';
    }

    const envText = readFileSync('.env.local', 'utf8');
    const line = envText
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith(`${key}=`));

    return line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') ?? '';
  } catch {
    return '';
  }
}

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
