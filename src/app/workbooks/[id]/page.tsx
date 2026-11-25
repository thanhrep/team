import AppLayout from "@/components/AppLayout";
import UniverEditor from "@/components/UniverEditor";
import Link from "next/link";

export default async function WorkbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppLayout>
      <main className="p-4 md:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <Link
              href="/workbooks"
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
            >
              ← Quay lại danh sách sổ bảng tính
            </Link>
            <h1 className="text-xl font-bold mt-1 text-slate-800">
              Trang Tính BIZWORK (Univer Sheets Core)
            </h1>
          </div>
        </div>
        <UniverEditor workbookId={id} />
      </main>
    </AppLayout>
  );
}
