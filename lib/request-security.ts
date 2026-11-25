import type { NextRequest } from 'next/server';

// Browsers send Origin on mutation requests. Direct trusted server clients may omit it.
export function sameOrigin(request: NextRequest) {
  const origin=request.headers.get('origin');
  if(!origin) return true;
  try { return new URL(origin).host===request.headers.get('host'); }
  catch { return false; }
}

const attempts=new Map<string,{count:number;expires:number}>();
const windowMs=15*60*1000;
export function loginAllowed(key:string) {
  const current=attempts.get(key);
  if(!current||current.expires<Date.now()) return true;
  return current.count<8;
}
export function loginFailed(key:string) {
  const current=attempts.get(key);
  if(!current||current.expires<Date.now()) attempts.set(key,{count:1,expires:Date.now()+windowMs});
  else current.count++;
  if(attempts.size>10000) for(const [id,item] of attempts) if(item.expires<Date.now()) attempts.delete(id);
}
export function loginSucceeded(key:string) { attempts.delete(key); }
