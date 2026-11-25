import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '../../../../lib/sqlite';
export const runtime='nodejs';
export async function POST(request:Request){const {name,email,password}=await request.json();if(!name||!email||String(password||'').length<8)return NextResponse.json({error:'Vui lòng nhập đủ thông tin, mật khẩu tối thiểu 8 ký tự.'},{status:400});if(getUserByEmail(email))return NextResponse.json({error:'Email đã tồn tại.'},{status:409});createUser(name,email,password);return NextResponse.json({ok:true,message:'Đăng ký thành công. Vui lòng chờ Admin duyệt tài khoản.'});}
