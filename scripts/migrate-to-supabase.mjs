import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Thiếu cấu hình Supabase.');
const cloud=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const local=new DatabaseSync(join(process.env.TEAMSPIRIT_DATA_DIR||join(process.cwd(),'data'),'teamspirit.sqlite'),{readOnly:true});
const tables=['users','customers','products','media','orders','inventory','employees','attendance','finance'];
const {count,error:countError}=await cloud.from('erp_records').select('id',{count:'exact',head:true});
if(countError) throw countError;
if(count!==0) throw Error('Đích Supabase đã có dữ liệu. Dừng để tránh ghi đè.');

const adminPassword=randomBytes(24).toString('base64url');
const salt=randomBytes(16).toString('hex');
const adminHash=`${salt}:${scryptSync(adminPassword,salt,64).toString('hex')}`;
let adminEmail='';
for(const table of tables){
  const data=local.prepare(`select * from ${table}`).all();
  if(table==='users') for(const row of data) if(row.role==='SUPER_ADMIN') {row.password_hash=adminHash;adminEmail=row.email;}
  if(!data.length) continue;
  const items=data.map(row=>({id:String(row.id),table_name:table,payload:row}));
  const {error}=await cloud.from('erp_records').insert(items);
  if(error) throw Error(`Không thể nhập ${table}: ${error.message}`);
  process.stdout.write(`${table}: ${data.length}\n`);
}
if(!adminEmail) throw Error('Không tìm thấy Admin trong bản cục bộ.');
const dataDir=join(process.cwd(),'data');mkdirSync(dataDir,{recursive:true});
const credentialPath=join(dataDir,'cloud-admin-credentials.txt');
writeFileSync(credentialPath,`TEAMSPIRIT Supabase test admin\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n`,{encoding:'utf8',mode:0o600,flag:'wx'});
process.stdout.write(`Đã lưu thông tin đăng nhập kiểm thử tại ${credentialPath}\n`);
