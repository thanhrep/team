import { NextResponse } from 'next/server';
import { cloudEnabled, rows } from '../../../lib/store';
export const runtime='nodejs';
export async function GET(){
  try { await rows('orders'); return NextResponse.json({ok:true,service:'TEAMSPIRIT ERP',database:cloudEnabled()?'Supabase':'SQLite',time:new Date().toISOString()}); }
  catch { return NextResponse.json({ok:false,service:'TEAMSPIRIT ERP',error:'Không kết nối được cơ sở dữ liệu.'},{status:503}); }
}
