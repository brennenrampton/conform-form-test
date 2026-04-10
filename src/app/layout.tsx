import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Utah Marriage License Application',
  description:
    'CLERK-style marriage license workflow built with Conform, Zod, IMask, Next.js server actions, and route handlers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
