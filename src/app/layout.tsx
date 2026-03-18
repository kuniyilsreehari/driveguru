import type {Metadata, Viewport} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { ChatAssistant } from '@/components/chat-assistant';
import { FloatingActions } from '@/components/floating-actions';
import { PwaPromptListener } from '@/components/pwa-prompt-listener';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AnnouncementBanner } from '@/components/layout/announcement-banner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'DriveGuru',
  description: 'Find local talent instantly.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'DriveGuru',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-body antialiased flex flex-col min-h-screen bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <PwaPromptListener />
            <AnnouncementBanner />
            <Header />
            <main className="flex-grow pb-20 sm:pb-0">
              {children}
            </main>
            <ChatAssistant />
            <FloatingActions />
            <BottomNav />
            <Footer />
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
