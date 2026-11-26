import { NextRequest, NextResponse } from "next/server";
import { formatGoogleSheets } from "../../../../../lib/google-server";
import { sessionUser } from "../../../../../lib/store";
import { sameOrigin } from "../../../../../lib/request-security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const user = await sessionUser(
    request.cookies.get("teamspirit_session")?.value,
  );
  if (!user || user.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Chỉ Admin mới được chuẩn hóa Google Sheets." },
      { status: 403 },
    );
  try {
    return NextResponse.json(await formatGoogleSheets());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chuẩn hóa thất bại." },
      { status: 503 },
    );
  }
}
