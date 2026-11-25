import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '../../../../lib/request-security';
export async function POST(request:NextRequest){if(!sameOrigin(request))return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});const response=NextResponse.json({ok:true});response.cookies.set('teamspirit_session','',{httpOnly:true,maxAge:0,path:'/'});return response;}
