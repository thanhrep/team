import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAi, type AiProvider } from '../../../../lib/ai-server';
import { all, userFromToken } from '../../../../lib/sqlite';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const user = userFromToken(request.cookies.get('teamspirit_session')?.value);
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Chức năng phân tích dành cho quản lý.' }, { status: 403 });
  }
  const body = await request.json() as { provider?: AiProvider; question?: string; tables?: string[] };
  const provider = body.provider === 'gpt' ? 'gpt' : 'gemini';
  const reports = {
    customers: () => ({ soKhach: all('customers').length }),
    products: () => ({ soSanPhamHetHang: all('products').filter(p => Number(p.stock) <= 0).length }),
    orders: () => ({ soDonChuaGiao: all('orders').filter(o => o.status !== 'ĐÃ GIAO').length }),
    inventory: () => ({ soPhieuKho: all('inventory').length }),
    employees: () => ({ soNhanVien: all('employees').length }),
    attendance: () => ({ soLuotDiLamThieuGioRa: all('attendance').filter(a => a.status === 'Đi làm' && !a.time_out).length }),
    finance: () => {
      const rows = all('finance');
      const sum = (kind: string) => rows.filter(r => r.kind === kind).reduce((n, r) => n + Number(r.amount_jpy), 0);
      return { tongThuJPY: sum('THU'), tongChiJPY: sum('CHI') };
    },
  };
  const selected = body.tables ?? Object.keys(reports);
  if (!Array.isArray(selected) || selected.some(key => typeof key !== 'string' || !Object.hasOwn(reports, key))) {
    return NextResponse.json({ error: 'Danh mục phân tích không hợp lệ.' }, { status: 400 });
  }
  const data = Object.fromEntries(selected.map(key => [key, reports[key as keyof typeof reports]()]));
  try { return NextResponse.json({ ok: true, provider, result: await analyzeWithAi(provider, body.question || 'Tổng hợp tình hình và tìm điểm bất thường.', data) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể gọi AI.' }, { status: 503 }); }
}
