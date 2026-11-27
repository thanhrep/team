import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '../../../../lib/sqlite';
import { newSession, userByEmail } from '../../../../lib/store';
import { loginAllowed, loginFailed, loginSucceeded, sameOrigin } from '../../../../lib/request-security';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  if(!sameOrigin(request)) return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
  const {email,password}=await request.json() as { email?: unknown; password?: unknown };
  const address=String(email||'').trim().toLowerCase();
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  const key=`${ip}:${address}`;
  if(!loginAllowed(key)) return NextResponse.json({error:'Thử lại sau 15 phút.'},{status:429});
  const user=await userByEmail(address);
  if(!user||!verifyPassword(String(password||''),String(user.password_hash))){
    loginFailed(key);
    return NextResponse.json({error:'Email hoặc mật khẩu chưa đúng.'},{status:401});
  }
  if(user.status!=='APPROVED') return NextResponse.json({error:`Tài khoản đang ở trạng thái ${user.status==='PENDING'?'chờ Admin duyệt':'bị khóa'}.`},{status:403});
  loginSucceeded(key);
  const token=await newSession(String(user.id));
  const response=NextResponse.json({ok:true});
  response.cookies.set('teamspirit_session',token,{httpOnly:true,sameSite:'lax',secure:request.nextUrl.protocol==='https:',path:'/',maxAge:7*86400});
  return response;
}
