import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata = {
  title: "Sistema Preoperacional - A&A Comunicaciones",
  description: "Registro y administracion de inspecciones preoperacionales de vehiculos.",
  applicationName: "Preoperacional A&A",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Preoperacional",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png"
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0066b3"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
