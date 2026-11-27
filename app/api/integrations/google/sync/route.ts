import { NextRequest, NextResponse } from 'next/server';
import { rows, sessionUser } from '../../../../../lib/store';
import { syncTablesToGoogleSheets } from '../../../../../lib/google-server';
import { sameOrigin } from '../../../../../lib/request-security';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if(!sameOrigin(request)) return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
  const user = await sessionUser(request.cookies.get('teamspirit_session')?.value);
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Chỉ Admin mới được đồng bộ Google Sheets.' }, { status: 403 });
  try {
    const tables = ['customers','products','media','orders','inventory','employees','attendance','finance'];
    const parsed=await request.json() as { table?: unknown; changes?: Record<string, Record<string, unknown>> };
    const tableName=String(parsed.table ?? '');
    const changes=parsed.changes ?? {};
    const ids=Object.keys(changes);
    if(!tables.includes(tableName)||!ids.length) return NextResponse.json({error:'Chọn dòng cần đồng bộ.'},{status:400});
    const selected = {[tableName]:(await rows(tableName)).filter(r=>ids.includes(String(r.id)))};
    return NextResponse.json({ ok: true, synced: await syncTablesToGoogleSheets(selected,changes) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Đồng bộ thất bại.' }, { status: 503 }); }
}
