import type { Metadata } from "next";
import { AppProvider } from "@/components/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Auto - Customer Support & Returns Automation",
  description: "Automate customer support and returns for your Shopify store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
