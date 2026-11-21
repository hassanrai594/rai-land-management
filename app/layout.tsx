import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Land Ledger | Estate management',
  description: 'Your land, clearly managed. Plots, buyers and payments in one private workspace.',
  icons: { icon: '/favicon.svg' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
