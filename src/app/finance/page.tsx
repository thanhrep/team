import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/prisma";

export default async function Finance() {
  const expenses = await db.expense.findMany({
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Kế toán</p>
        <h1 className="text-3xl font-bold mt-2">Quản Lý Tài Chính & Chi Phí</h1>
        <p className="text-gray-500 mt-1">
          Theo dõi các khoản chi phí nhập hàng, vận chuyển, in ấn và tỷ giá hối đoái JPY/VND.
        </p>

        <div className="mt-6 bg-white border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="p-3 text-left">Hạng mục chi phí</th>
                <th className="p-3 text-left">Phân loại</th>
                <th className="p-3 text-left">Ngày phát sinh</th>
                <th className="p-3 text-right">Số tiền (JPY)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Chưa có khoản chi phí nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                expenses.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-semibold text-slate-800">{x.title}</td>
                    <td className="p-3 text-slate-600">{x.category}</td>
                    <td className="p-3 text-slate-500">{x.occurredAt.toLocaleDateString("vi-VN")}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ¥ {Number(x.amountJpy).toLocaleString("ja-JP")}
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
