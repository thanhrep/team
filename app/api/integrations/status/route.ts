import { NextResponse } from 'next/server';
import { integrationStatus } from '../../../../lib/runtime-config';

export const runtime = 'nodejs';
export async function GET() { return NextResponse.json({ providers: integrationStatus() }); }
