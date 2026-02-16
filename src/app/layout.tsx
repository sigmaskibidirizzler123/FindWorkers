import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";

// Bootstrap server-side modules (event handlers, etc.)
import '@/modules/index';

export const metadata: Metadata = {
  metadataBase: new URL('https://findworkers.vn'), // Replace with your production domain later
  title: {
    default: "FindWorkers Phú Quốc - Tuyển dụng & Tìm việc Khách sạn, Nhà hàng",
    template: "%s | FindWorkers Phú Quốc",
  },
  description: "Cổng thông tin việc làm số 1 tại Phú Quốc. Chuyên tuyển dụng Khách sạn, Nhà hàng, Resort, F&B. Tìm việc nhanh, lương cao, đi làm ngay.",
  keywords: [
    "tìm việc phú quốc", "tuyển dụng phú quốc", "việc làm khách sạn phú quốc",
    "việc làm nhà hàng", "findworkers", "việc làm bao ăn ở", "tuyển phụ bếp", "tuyển lễ tân"
  ],
  authors: [{ name: "FindWorkers Team" }],
  creator: "FindWorkers",
  openGraph: {
    title: "FindWorkers Phú Quốc - Việc làm Khách sạn & Nhà hàng",
    description: "Hàng trăm việc làm mới tại Phú Quốc mỗi ngày. Kết nối trực tiếp với chủ doanh nghiệp. Không qua trung gian.",
    url: 'https://findworkers.vn',
    siteName: 'FindWorkers',
    images: [
      {
        url: '/og-image.jpg', // You need to add an image later
        width: 1200,
        height: 630,
        alt: 'FindWorkers Phú Quốc',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
