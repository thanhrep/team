import AppLayout from "@/components/AppLayout";
import MediaLibrary from "@/components/MediaLibrary";

export default async function Media() {
  return (
    <AppLayout>
      <main className="p-6 md:p-9">
        <p className="text-sm text-gray-500">BIZWORK / Media</p>
        <h1 className="text-3xl font-bold mt-2">Thư Viện Ảnh @Mã Định Danh</h1>
        <p className="text-gray-500 mt-1">
          Quản lý ảnh sản phẩm và logo câu lạc bộ. Mỗi ảnh được gắn mã @1, @2... để gọi tự động trong bảng tính.
        </p>
        <MediaLibrary />
      </main>
    </AppLayout>
  );
}
