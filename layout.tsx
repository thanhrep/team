import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"BIZWORK | Quản trị kinh doanh",description:"Hệ thống quản lý nội bộ BIZWORK"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
