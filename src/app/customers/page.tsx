import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/prisma";

export default async function Customers() {
  const rows = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Khách hàng</p>
        <h1 className="text-3xl font-bold mt-2">Danh Sách Khách Hàng Nhật Bản</h1>
        <p className="text-gray-500 mt-1">
          Hồ sơ khách hàng, mã bưu điện 7 chữ số, tỉnh thành phố và lịch sử mua áo đấu.
        </p>

        <div className="mt-6 bg-white border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="p-3 text-left">Tên khách hàng</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Số điện thoại</th>
                <th className="p-3 text-left">Mã bưu điện & Tỉnh thành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Chưa có khách hàng nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                rows.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-semibold text-slate-800">{x.name}</td>
                    <td className="p-3 text-slate-600">{x.email || "—"}</td>
                    <td className="p-3 text-slate-600">{x.phone || "—"}</td>
                    <td className="p-3 text-slate-700">
                      {x.postalCode && <span className="font-mono mr-2">〒{x.postalCode}</span>}
                      {x.prefecture} {x.city} {x.address1}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </AppLayout>
  );
}
