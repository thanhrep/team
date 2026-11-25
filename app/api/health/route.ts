import { NextResponse } from 'next/server';
export const runtime='nodejs';
export function GET(){return NextResponse.json({ok:true,service:'TEAMSPIRIT ERP',database:'SQLite',time:new Date().toISOString()});}
