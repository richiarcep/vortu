import type { Metadata, Viewport } from "next";
import "./globals.css";
import JurisdictionGuard from "@/components/JurisdictionGuard";
import TokenRefresher from "@/components/TokenRefresher";
import DemoBadge from "@/components/DemoBadge";
import { ThemeProvider } from "@/components/ui/tokens";
import { CompanyProvider } from "@/components/CompanyProvider";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const metadata: Metadata = {
  title: "Vela",
  description: "Gestión empresarial inteligente para pymes y autónomos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Fija el tema antes del primer pintado para evitar el parpadeo (FOUC).
const themeInit = `(function(){try{var t=localStorage.getItem('vela_theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <a href="#main-content" className="skip-link">Saltar al contenido</a>
        <ThemeProvider>
          <CompanyProvider>
            <ImpersonationBanner />
            <TokenRefresher />
            <JurisdictionGuard>
              {children}
            </JurisdictionGuard>
            <DemoBadge />
          </CompanyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
