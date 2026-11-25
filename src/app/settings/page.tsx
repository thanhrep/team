import AppLayout from "@/components/AppLayout";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import UserControls from "@/components/UserControls";

export default async function Settings() {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return (
      <AppLayout>
        <main className="p-8 text-rose-600 font-semibold">
          Bạn không có quyền quản lý người dùng và phê duyệt.
        </main>
      </AppLayout>
    );
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Hệ thống</p>
        <h1 className="text-3xl font-bold mt-2">Người Dùng & Phân Quyền</h1>
        <p className="text-gray-500 mt-1">
          Duyệt tài khoản nhân viên mới đăng ký, cấp quyền (ADMIN, MANAGER, STAFF, VIEWER) hoặc khóa tài khoản.
        </p>

        <div className="mt-6 bg-white border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="p-3 text-left">Họ tên & Email</th>
                <th className="p-3 text-center">Vai trò</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <span className="font-semibold text-slate-900 block">{item.name}</span>
                    <span className="text-xs font-mono text-slate-500">{item.email}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      {item.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 animate-pulse"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {item.status === "APPROVED"
                        ? "Đã duyệt"
                        : item.status === "PENDING"
                        ? "Chờ duyệt"
                        : item.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <UserControls id={item.id} status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppLayout>
  );
}
