import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '../../../../lib/sqlite';
import { newSession, userByEmail } from '../../../../lib/store';
export const runtime='nodejs';
export async function POST(request:NextRequest){const {email,password}=await request.json();const user=await userByEmail(String(email||''));if(!user||!verifyPassword(String(password||''),String(user.password_hash)))return NextResponse.json({error:'Email hoặc mật khẩu chưa đúng.'},{status:401});if(user.status!=='APPROVED')return NextResponse.json({error:`Tài khoản đang ở trạng thái ${user.status==='PENDING'?'chờ Admin duyệt':'bị khóa'}.`},{status:403});const token=await newSession(String(user.id));const response=NextResponse.json({ok:true});response.cookies.set('teamspirit_session',token,{httpOnly:true,sameSite:'lax',secure:request.nextUrl.protocol==='https:',path:'/',maxAge:7*86400});return response;}
