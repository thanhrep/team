import { NextRequest, NextResponse } from 'next/server';
import { rows, sessionUser } from '../../../../../lib/store';
import { syncTablesToGoogleSheets } from '../../../../../lib/google-server';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const user = await sessionUser(request.cookies.get('teamspirit_session')?.value);
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Chỉ Admin mới được đồng bộ Google Sheets.' }, { status: 403 });
  try {
    const tables = ['customers','products','media','orders','inventory','employees','attendance','finance'];
    const {table,changes}=await request.json();
    const ids=Object.keys(changes??{});
    if(!tables.includes(table)||!Array.isArray(ids)||!ids.length) return NextResponse.json({error:'Chọn dòng cần đồng bộ.'},{status:400});
    const selected = {[table]:(await rows(table)).filter(r=>ids.includes(String(r.id)))};
    return NextResponse.json({ ok: true, synced: await syncTablesToGoogleSheets(selected,changes) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Đồng bộ thất bại.' }, { status: 503 }); }
}
