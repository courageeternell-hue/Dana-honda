import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "Honda Sales Report",
  description: "Sistem laporan prospek dan SPK tim sales Honda",
  manifest: "/manifest.json",
  themeColor: "#D71920"
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#D71920"
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
