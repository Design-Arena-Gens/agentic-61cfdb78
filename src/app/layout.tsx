import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Agentic Instagram Automation',
  description:
    'Generate AI-assisted Instagram videos, schedule auto-posting, and automate your creator workflow in one dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-slate-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 antialiased text-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}
