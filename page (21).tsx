import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import {db} from "@/lib/prisma";
import UserControls from "@/components/UserControls";
export default async function Settings(){
 const user=await currentUser();if(!user)redirect("/login");
 if(!["SUPER_ADMIN","ADMIN"].includes(user.role))return <main className="p-8">Không có quyền quản lý người dùng.</main>;
 const users=await db.user.findMany({select:{id:true,name:true,email:true,status:true,role:true,createdAt:true},orderBy:{createdAt:"desc"}});
 return <main className="p-6 md:p-10"><a href="/dashboard" className="text-sm text-blue-800">← Tổng quan</a><h1 className="text-3xl font-bold mt-3">Người dùng và phê duyệt</h1><p className="text-gray-500 mt-1">API kiểm tra quyền ở backend; admin duyệt hoặc khóa tài khoản.</p><div className="mt-6 bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Nhân viên</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Duyệt / khóa</th></tr></thead><tbody>{users.map(item=><tr key={item.id} className="border-t"><td className="p-3">{item.name}<div className="text-gray-500">{item.email}</div></td><td className="p-3">{item.role}</td><td className="p-3">{item.status}</td><td className="p-3"><UserControls id={item.id} status={item.status}/></td></tr>)}</tbody></table></div></main>;
}
