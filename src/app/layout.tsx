import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { CurrencyProvider } from "@/providers/currency-provider";
import { NotificationsProvider } from "@/modules/notifications/components/notifications-provider";
import { auth } from "@/auth";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UnkoApp",
  description:
    "Una app para dividir gastos en viajes grupales, sin complicaciones.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UnkoApp",
  },
  icons: {
    apple: "/logo/logo-192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <CurrencyProvider>
          {userId ? (
            <NotificationsProvider userId={userId}>
              {children}
            </NotificationsProvider>
          ) : children}
          </CurrencyProvider>
          <Toaster
            richColors
            position="bottom-center"
            offset={20}
            duration={3500}
            closeButton
          />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registrado con éxito:', registration.scope);
                    },
                    function(err) {
                      console.log('Fallo al registrar el Service Worker:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
