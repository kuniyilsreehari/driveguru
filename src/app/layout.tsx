
import type {Metadata} from 'next';
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

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'DriveGuru',
  description: 'Find local talent instantly.',
  manifest: '/manifest.json'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icons/apple-touch-icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-body antialiased flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <PwaPromptListener />
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <ChatAssistant />
            <FloatingActions />
            <Footer />
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
