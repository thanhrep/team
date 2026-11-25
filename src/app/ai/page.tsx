import AppLayout from "@/components/AppLayout";
import AIChat from "@/components/AIChat";

export default async function AIPage() {
  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Trợ lý</p>
        <h1 className="text-3xl font-bold mt-2">Trợ Lý AI Doanh Nghiệp</h1>
        <p className="text-gray-500 mt-1">
          Trợ lý phân tích doanh thu, báo cáo đơn hàng và dữ liệu kinh doanh áo đấu qua Ollama nội bộ.
        </p>
        <div className="mt-6">
          <AIChat />
        </div>
      </main>
    </AppLayout>
  );
}
