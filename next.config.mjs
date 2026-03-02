/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 注意：如果上面的写法报错，尝试删掉 eslint 这一段，或者改为：
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
