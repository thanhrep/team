import { NextRequest, NextResponse } from 'next/server';
import { registerUser, userByEmail } from '../../../../lib/store';
import { sameOrigin } from '../../../../lib/request-security';
export const runtime='nodejs';
export async function POST(request:NextRequest){if(!sameOrigin(request))return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});const {name,email,password}=await request.json() as {name?: unknown; email?: unknown; password?: unknown};if(!name||!email||String(password||'').length<8)return NextResponse.json({error:'Vui lòng nhập đủ thông tin, mật khẩu tối thiểu 8 ký tự.'},{status:400});if(await userByEmail(String(email)))return NextResponse.json({error:'Email đã tồn tại.'},{status:409});await registerUser(String(name),String(email),String(password));return NextResponse.json({ok:true,message:'Đăng ký thành công. Vui lòng chờ Admin duyệt tài khoản.'});}
