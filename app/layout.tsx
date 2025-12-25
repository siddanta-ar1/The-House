// app/layout.tsx
import './globals.css';
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} font-sans bg-cafe-paper`}>
        {children}
      </body>
    </html>
  );
}