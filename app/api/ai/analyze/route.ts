import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAi, type AiProvider } from '../../../../lib/ai-server';
import { rows, sessionUser } from '../../../../lib/store';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const user = await sessionUser(request.cookies.get('teamspirit_session')?.value);
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Chức năng phân tích dành cho quản lý.' }, { status: 403 });
  }
  const body = await request.json() as { provider?: AiProvider; question?: string; tables?: string[] };
  const provider = body.provider === 'gpt' ? 'gpt' : 'gemini';
  const reports = {
    customers: async () => ({ soKhach: (await rows('customers')).length }),
    products: async () => ({ soSanPhamHetHang: (await rows('products')).filter(p => Number(p.stock) <= 0).length }),
    orders: async () => ({ soDonChuaGiao: (await rows('orders')).filter(o => o.status !== 'ĐÃ GIAO').length }),
    inventory: async () => ({ soPhieuKho: (await rows('inventory')).length }),
    employees: async () => ({ soNhanVien: (await rows('employees')).length }),
    attendance: async () => ({ soLuotDiLamThieuGioRa: (await rows('attendance')).filter(a => a.status === 'Đi làm' && !a.time_out).length }),
    finance: async () => {
      const data = await rows('finance');
      const sum = (kind: string) => data.filter(r => r.kind === kind).reduce((n, r) => n + Number(r.amount_jpy), 0);
      return { tongThuJPY: sum('THU'), tongChiJPY: sum('CHI') };
    },
  };
  const selected = body.tables ?? Object.keys(reports);
  if (!Array.isArray(selected) || selected.some(key => typeof key !== 'string' || !Object.hasOwn(reports, key))) {
    return NextResponse.json({ error: 'Danh mục phân tích không hợp lệ.' }, { status: 400 });
  }
  const data = Object.fromEntries(await Promise.all(selected.map(async key => [key, await reports[key as keyof typeof reports]()] as const)));
  try { return NextResponse.json({ ok: true, provider, result: await analyzeWithAi(provider, body.question || 'Tổng hợp tình hình và tìm điểm bất thường.', data) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể gọi AI.' }, { status: 503 }); }
}
