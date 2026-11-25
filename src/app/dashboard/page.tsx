import AppLayout from "@/components/AppLayout";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function Dashboard() {
  const u = await currentUser();
  const [products, orders, pending, images] = await Promise.all([
    db.product.count(),
    db.order.count(),
    db.user.count({ where: { status: "PENDING" } }),
    db.mediaImage.count(),
  ]);

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Tổng quan</p>
        <h1 className="text-3xl font-bold mt-2">Tổng quan kinh doanh</h1>
        <p className="text-gray-500 mt-1">Xin chào, {u?.name}</p>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mt-8">
          {[
            ["Sản phẩm", products],
            ["Đơn hàng", orders],
            ["Chờ duyệt", pending],
            ["Ảnh", images],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">{k}</p>
              <p className="text-3xl font-bold mt-2 text-slate-900">{v}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-slate-800">Nền tảng BIZWORK 2.0</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Hệ thống quản lý nội bộ độc lập dành cho doanh nghiệp áo bóng đá và đồng phục thể thao Nhật Bản.
            Tất cả các module nghiệp vụ kết nối trực tiếp với PostgreSQL nội bộ, đảm bảo tính bảo mật và toàn vẹn dữ liệu.
          </p>
        </section>
      </main>
    </AppLayout>
  );
}
