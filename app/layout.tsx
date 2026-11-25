import type { Metadata } from 'next';
import './globals.css';
import './viewport.css';
import ServiceWorker from './ServiceWorker';

export const metadata: Metadata = { title: 'TEAMSPIRIT ERP', description: 'Hệ thống quản lý doanh nghiệp áo bóng đá Nhật Bản' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><ServiceWorker />{children}</body></html>;
}
