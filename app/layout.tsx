import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "House of Representatives Visualizer",
  description:
    "Interactive map of all 435 U.S. Congressional Districts — explore representatives, election margins, income, tenure, and more.",
  openGraph: {
    title: "House of Representatives Visualizer",
    description: "Interactive map of all 435 U.S. Congressional Districts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">{children}</body>
    </html>
  );
}
