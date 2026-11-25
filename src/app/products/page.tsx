import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/prisma";

export default async function Products() {
  const rows = await db.product.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Danh mục</p>
        <h1 className="text-3xl font-bold mt-2">Danh Mục Sản Phẩm & Size</h1>
        <p className="text-gray-500 mt-1">
          Quản lý áo đấu câu lạc bộ, đội tuyển quốc gia và size Nhật Bản (S, M, L, XL, XXL).
        </p>

        <div className="mt-6 overflow-x-auto bg-white border rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="p-3 text-left">Mã SKU</th>
                <th className="p-3 text-left">Tên sản phẩm</th>
                <th className="p-3 text-left">Phân loại</th>
                <th className="p-3 text-right">Giá bán (JPY)</th>
                <th className="p-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Chưa có sản phẩm nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                rows.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-medium text-blue-900">{x.sku}</td>
                    <td className="p-3 font-medium text-slate-800">{x.name}</td>
                    <td className="p-3 text-slate-600">{x.category}</td>
                    <td className="p-3 text-right font-semibold text-slate-900">
                      ¥ {Number(x.salePriceJpy).toLocaleString("ja-JP")}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {x.status}
                      </span>
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
