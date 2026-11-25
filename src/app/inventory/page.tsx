import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/prisma";

export default async function Inventory() {
  const variants = await db.productVariant.findMany({
    include: { product: true },
    orderBy: { stock: "desc" },
    take: 100,
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Kho bãi</p>
        <h1 className="text-3xl font-bold mt-2">Quản Lý Tồn Kho Áo Đấu</h1>
        <p className="text-gray-500 mt-1">
          Theo dõi số lượng tồn kho theo từng Size (S, M, L, XL, XXL) và biến thể màu sắc.
        </p>

        <div className="mt-6 bg-white border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="p-3 text-left">Mã SKU Biến Thể</th>
                <th className="p-3 text-left">Tên áo đấu</th>
                <th className="p-3 text-center">Kích cỡ (Size)</th>
                <th className="p-3 text-center">Màu sắc</th>
                <th className="p-3 text-right">Số lượng tồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Chưa có dữ liệu tồn kho.
                  </td>
                </tr>
              ) : (
                variants.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-medium text-blue-900">{v.sku}</td>
                    <td className="p-3 font-medium text-slate-800">{v.product.name}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{v.size}</td>
                    <td className="p-3 text-center text-slate-600">{v.color || "Tiêu chuẩn"}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{v.stock} bộ</td>
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
