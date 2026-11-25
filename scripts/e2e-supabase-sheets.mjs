import nextEnv from '@next/env';
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
const credential=readFileSync(join(process.cwd(),'data','cloud-admin-credentials.txt'),'utf8');
const email=credential.match(/^Email: (.+)$/m)?.[1];
const password=credential.match(/^Password: (.+)$/m)?.[1];
if(!email||!password) throw Error('Không tìm thấy tài khoản thử nghiệm.');
const base='http://127.0.0.1:3000';
async function call(path,body,cookie){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
  const json=await response.json();
  return {status:response.status,json,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
function assert(condition,message){if(!condition)throw Error(message);}
const first=await call('/api/auth/login',{email,password});
const second=await call('/api/auth/login',{email,password});
assert(first.status===200&&second.status===200,'Không đăng nhập được hai phiên.');
const orderNo=`TS-QA-${Date.now()}`;
const created=await call('/api/erp',{action:'add',table:'orders',data:{order_no:orderNo,customer_name:'Khách thử nghiệm',team:'Nhật Bản',product:'Kiểm tra đồng bộ',size:'M',quantity:1,total_jpy:0,status:'MỚI',tracking:''}},first.cookie);
assert(created.status===200,'Không tạo được đơn thử: '+JSON.stringify(created.json));
const id=created.json.row.id;
const duplicate=await call('/api/erp',{action:'add',table:'orders',data:{order_no:orderNo,customer_name:'Khách thử nghiệm'}},first.cookie);
assert(duplicate.status===409,'Không chặn được mã đơn trùng.');
const view=await call('/api/erp',undefined,second.cookie);
assert(view.status===200&&view.json.tables.orders.some(row=>row.id===id),'Phiên thứ hai không thấy đơn mới trên Supabase.');
const old=view.json.tables.orders.find(row=>row.id===id);
const edited=await call('/api/erp',{action:'update',table:'orders',id,changes:{status:'ĐANG MAY'},expected:{status:old.status}},first.cookie);
assert(edited.status===200,'Không sửa được trạng thái đơn.');
const stale=await call('/api/erp',{action:'update',table:'orders',id,changes:{status:'ĐÃ GIAO'},expected:{status:old.status}},second.cookie);
assert(stale.status===409,'Không phát hiện chỉnh sửa xung đột.');
const synced=await call('/api/integrations/google/sync',{table:'orders',changes:{[id]:{}}},first.cookie);
assert(synced.status===200,'Không đồng bộ được Sheet: '+JSON.stringify(synced.json));
const auth=new google.auth.GoogleAuth({credentials:JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
const sheets=google.sheets({version:'v4',auth});
const result=await sheets.spreadsheets.values.get({spreadsheetId:process.env.GOOGLE_SHEET_ID,range:"'Đơn đặt may'!A:AZ"});
const grid=result.data.values||[];
const col=grid[0].indexOf('id');
assert(col>=0&&grid.slice(1).some(row=>row[col]===id),'Đơn chưa xuất hiện đúng ID trên Google Sheet thật.');
process.stdout.write(JSON.stringify({orderNo,orderId:id,firstSession:200,secondSession:200,duplicate:duplicate.status,staleUpdate:stale.status,sheetMatched:true})+'\n');
