import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MentorHub',
  description: '1:1 video mentoring with practitioners who have done it before.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
