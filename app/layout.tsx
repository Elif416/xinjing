import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// 类似 SF Pro 的无衬线字体：确保极简与苹果风格的一致性
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap'
});

export const metadata: Metadata = {
  title: '心镜 HeartMirror',
  description: '极简与玻璃质感的 HeartMirror 首页原型。'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} min-h-screen bg-[#f5f5f7]`}>
        {children}
      </body>
    </html>
  );
}
