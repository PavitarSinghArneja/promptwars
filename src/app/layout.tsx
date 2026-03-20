/**
 * Aegis Bridge — Root Layout
 * Semantic HTML landmarks, skip-nav, ARIA, Google Inter font
 */
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Aegis Bridge — Emergency Triage System",
  description:
    "Gemini-powered universal bridge between messy real-world inputs and life-saving structured emergency actions.",
  keywords: ["emergency", "triage", "AI", "first aid", "Gemini", "medical"],
  authors: [{ name: "Aegis Bridge Team" }],
};

export const viewport: Viewport = {
  themeColor: "#050508",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-mesh" style={{ backgroundColor: "var(--color-surface-950)" }}>
        {/* Skip navigation — a11y: keyboard-first users bypass nav */}
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>

        {/* Primary site header */}
        <Header />

        {/* Main landmark */}
        <main
          id="main-content"
          role="main"
          aria-label="Emergency triage workspace"
          className="flex flex-col flex-1 w-full"
        >
          {children}
        </main>

        {/* Footer landmark */}
        <footer
          role="contentinfo"
          aria-label="Site information"
          className="border-t py-4 px-6 text-center text-sm"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          <p>
            Aegis Bridge &mdash; Powered by{" "}
            <span aria-label="Google Vertex AI Gemini">Vertex AI Gemini 2.0 Flash</span>{" "}
            &amp; Firebase &bull; &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </body>
    </html>
  );
}
