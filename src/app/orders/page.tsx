import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/prisma";

export default async function Orders() {
  const rows = await db.order.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Bán hàng</p>
        <h1 className="text-3xl font-bold mt-2">Quản Lý Đơn Hàng Nhật Bản</h1>
        <p className="text-gray-500 mt-1">
          Theo dõi đơn hàng, địa chỉ bưu điện 7 số Nhật Bản và vận chuyển Yamato / Sagawa.
        </p>

        <div className="mt-6 bg-white border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="p-3 text-left">Mã đơn</th>
                <th className="p-3 text-left">Khách hàng</th>
                <th className="p-3 text-left">Vận chuyển</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 text-right">Tổng thanh toán (JPY)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Chưa có đơn hàng nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                rows.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-medium text-blue-900">{x.orderNo}</td>
                    <td className="p-3 font-medium text-slate-800">
                      {x.customer?.name}
                      {x.customer?.prefecture && (
                        <span className="block text-xs text-gray-400">
                          {x.customer.prefecture} {x.customer.city}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 text-xs">
                      {x.carrier || "Yamato Transport"}
                      {x.trackingNumber && (
                        <span className="block font-mono text-gray-400">{x.trackingNumber}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {x.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ¥ {Number(x.totalJpy).toLocaleString("ja-JP")}
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
