import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/prisma";
import Link from "next/link";
import NewWorkbook from "@/components/NewWorkbook";

export default async function Workbooks() {
  const books = await db.workbook.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Bảng tính</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">Bảng Tính Nội Bộ BIZWORK</h1>
            <p className="text-gray-500 mt-1">
              Trình chỉnh sửa bảng tính Univer Community Core (Apache-2.0) tích hợp lưu tự động và chống xung đột.
            </p>
          </div>
          <NewWorkbook />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.map((b) => (
            <Link
              key={b.id}
              href={"/workbooks/" + b.id}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-base">{b.name}</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">Mở bảng tính</span>
              </div>
              <span className="text-xs text-gray-400 block mt-2">
                Cập nhật lần cuối: {b.updatedAt.toLocaleString("vi-VN")}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
