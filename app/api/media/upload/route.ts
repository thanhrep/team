import { NextRequest, NextResponse } from "next/server";
import { addRow, sessionUser } from "../../../../lib/store";
import { sameOrigin } from "../../../../lib/request-security";
import { saveMedia } from "../../../../lib/media-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const user = await sessionUser(
    request.cookies.get("teamspirit_session")?.value,
  );
  if (!user || !["SUPER_ADMIN", "MANAGER", "SALES"].includes(String(user.role)))
    return NextResponse.json(
      { error: "Bạn không có quyền tải ảnh." },
      { status: 403 },
    );
  const form = await request.formData();
  const file = form.get("file");
  const productName = String(form.get("product_name") || "").trim();
  const category = String(form.get("category") || "Sản phẩm").trim();
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "Vui lòng chọn ảnh." }, { status: 400 });
  if (!productName || productName.length > 255)
    return NextResponse.json(
      { error: "Vui lòng nhập tên sản phẩm hợp lệ (tối đa 255 ký tự)." },
      { status: 400 },
    );
  if (!file.type.startsWith("image/"))
    return NextResponse.json(
      { error: "Chỉ hỗ trợ tệp hình ảnh." },
      { status: 400 },
    );
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json(
      { error: "Ảnh không được vượt quá 10MB." },
      { status: 400 },
    );
  try {
    const saved = await saveMedia(file);
    const row = {
      id: `med_${crypto.randomUUID()}`,
      name: productName,
      type: file.type,
      url: saved.url,
      category,
      created_at: new Date().toISOString(),
    };
    await addRow("media", row);
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tải ảnh thất bại." },
      { status: 503 },
    );
  }
}
