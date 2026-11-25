import { createHash, randomBytes } from 'node:crypto';
import { all, createSession, createUser, db, getUserByEmail, insert, type Row, update, userFromToken } from './sqlite';
import { getSupabaseAdmin } from './supabase-server';

export const columns: Record<string, string[]> = {
  customers: ['id','name','phone','email','country','address','note','created_at'],
  products: ['id','sku','name','category','team','season','color','cost_jpy','sale_jpy','stock','status','image_url','created_at'],
  media: ['id','name','type','url','category','created_at'],
  orders: ['id','order_no','customer_name','team','product','size','quantity','total_jpy','status','tracking','created_at'],
  inventory: ['id','sku','product','type','quantity','warehouse','note','created_at'],
  employees: ['id','code','name','department','position','salary_jpy','phone','status'],
  attendance: ['id','employee_id','work_date','status','time_in','time_out','note'],
  finance: ['id','kind','category','amount_jpy','description','occurred_at'],
  users: ['id','name','email','password_hash','role','status','created_at'],
};

function client() { return getSupabaseAdmin(); }
function check(error: { message: string } | null) { if (error) throw new Error(error.message); }
export function cloudEnabled() { return Boolean(client()); }

export async function rows(table: string): Promise<Row[]> {
  if (!columns[table]) throw new Error('Danh mục không hợp lệ.');
  const supabase = client();
  if (!supabase) return all(table);
  const { data, error } = await supabase.from('erp_records').select('payload').eq('table_name',table).order('updated_at',{ascending:false});
  check(error);
  return (data ?? []).map(item => item.payload as Row);
}

export async function byId(table: string, id: string): Promise<Row | undefined> {
  if (!columns[table]) throw new Error('Danh mục không hợp lệ.');
  const supabase = client();
  if (!supabase) return db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as Row | undefined;
  const { data,error } = await supabase.from('erp_records').select('payload').eq('table_name',table).eq('id',id).maybeSingle();
  check(error);
  return data?.payload as Row | undefined;
}

export async function addRow(table: string, row: Row) {
  if (!columns[table]) throw new Error('Danh mục không hợp lệ.');
  const supabase = client();
  if (!supabase) return insert(table,row);
  const { error } = await supabase.from('erp_records').insert({id:String(row.id),table_name:table,payload:row});
  check(error);
}

export async function deleteRow(table: string, id: string) {
  if (!columns[table]) throw new Error('Danh mục không hợp lệ.');
  const supabase = client();
  if (!supabase) {
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
    return;
  }
  const { error } = await supabase.from('erp_records').delete().eq('table_name', table).eq('id', id);
  check(error);
}

export async function updateRow(table: string, id: string, expected: Row, changes: Row): Promise<boolean> {
  if (!columns[table]) throw new Error('Danh mục không hợp lệ.');
  if (Object.keys(changes).some(key=>!Object.hasOwn(expected,key))) return false;
  const supabase = client();
  if (supabase) {
    const {data,error} = await supabase.rpc('erp_update_record',{p_id:id,p_table:table,p_expected:expected,p_changes:changes});
    check(error);
    return data === true;
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as Row | undefined;
    if (!current || Object.keys(changes).some(key=>current[key]!==expected[key])) { db.exec('ROLLBACK'); return false; }
    update(table,id,changes);
    db.exec('COMMIT');
    return true;
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

export async function userByEmail(email: string): Promise<Row | undefined> {
  const supabase = client();
  if (!supabase) return getUserByEmail(email);
  const users = await rows('users');
  return users.find(user=>String(user.email).toLowerCase()===email.toLowerCase());
}

export async function registerUser(name: string,email: string,password: string) {
  if (!client()) return createUser(name,email,password);
  const { scryptSync } = await import('node:crypto');
  const salt = randomBytes(16).toString('hex');
  const user = { id:`usr_${randomBytes(6).toString('hex')}`,name,email,password_hash:`${salt}:${scryptSync(password,salt,64).toString('hex')}`,role:'STAFF',status:'PENDING',created_at:new Date().toISOString() };
  await addRow('users',user);
  return user;
}

export async function newSession(userId: string) {
  const supabase = client();
  if (!supabase) return createSession(userId);
  const raw=randomBytes(32).toString('hex');
  const token_hash=createHash('sha256').update(raw).digest('hex');
  const {error}=await supabase.from('erp_sessions').insert({token_hash,user_id:userId,expires_at:new Date(Date.now()+7*86400000).toISOString()});
  check(error);
  return raw;
}

export async function sessionUser(raw: string | undefined): Promise<Row | undefined> {
  if (!raw) return undefined;
  const supabase=client();
  if (!supabase) return userFromToken(raw);
  const hash=createHash('sha256').update(raw).digest('hex');
  const {data,error}=await supabase.from('erp_sessions').select('user_id').eq('token_hash',hash).gt('expires_at',new Date().toISOString()).maybeSingle();
  check(error);
  if (!data) return undefined;
  const user=await byId('users',data.user_id);
  return user?.status==='APPROVED'?user:undefined;
}
