// app/layout.tsx
import './globals.css';
import { Playfair_Display, Inter } from 'next/font/google';
import type { Viewport } from 'next';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1A1A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${playfair.variable} ${inter.variable} font-sans bg-cafe-paper`}>
        {children}
      </body>
    </html>
  );
}