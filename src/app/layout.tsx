import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";

// Bootstrap server-side modules (event handlers, etc.)
import '@/modules/index';

export const metadata: Metadata = {
  title: "FindWorkers - Nền tảng Tuyển dụng & Tìm việc Thông minh",
  description: "Kết nối ứng viên với nhà tuyển dụng. Tìm việc nhanh, tuyển dụng hiệu quả. Chuyên tuyển dụng F&B, lao động phổ thông, nhà hàng - khách sạn.",
  keywords: "tuyển dụng, tìm việc, việc làm, F&B, nhà hàng, khách sạn, lao động phổ thông, FindWorkers",
  openGraph: {
    title: "FindWorkers - Nền tảng Tuyển dụng & Tìm việc Thông minh",
    description: "Kết nối ứng viên với nhà tuyển dụng. Tìm việc nhanh, tuyển dụng hiệu quả.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ErrorBoundary>
            <Navbar />
            <main className="min-h-screen pt-16">
              {children}
            </main>
            <Footer />
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
