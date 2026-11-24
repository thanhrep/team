"use client";
import {useEffect,useRef,useState} from "react";
import "@univerjs/preset-sheets-core/lib/index.css";
export default function UniverEditor({workbookId}:{workbookId:string}){
 const host=useRef<HTMLDivElement>(null);const [status,setStatus]=useState("Đang tải bảng tính…");const [save,setSave]=useState<(()=>Promise<void>)|null>(null);
 useEffect(()=>{let instance:{dispose:()=>void}|null=null;let timer:ReturnType<typeof setInterval>|null=null;let alive=true;
 (async()=>{try{
  const [{createUniver,LocaleType,mergeLocales},{UniverSheetsCorePreset},locale]=await Promise.all([import("@univerjs/presets"),import("@univerjs/preset-sheets-core"),import("@univerjs/preset-sheets-core/locales/en-US")]);
  const response=await fetch("/api/workbooks/"+workbookId);if(!response.ok)throw new Error("Không tải được bảng tính");const data=await response.json();if(!alive||!host.current)return;
  const child=document.createElement("div");child.style.height="100%";host.current.append(child);
  const result=createUniver({locale:LocaleType.EN_US,locales:{[LocaleType.EN_US]:mergeLocales(locale.default)},presets:[UniverSheetsCorePreset({container:child})]});
  const workbook=result.univerAPI.createWorkbook(data.snapshot||{name:data.name});instance=result.univer;let lastSaved=JSON.stringify(workbook.save());let saving=false;
  const saveNow=async()=>{if(saving)return;saving=true;try{await workbook.endEditingAsync(true);const snapshot=workbook.save();const serialized=JSON.stringify(snapshot);if(serialized===lastSaved)return;const r=await fetch("/api/workbooks/"+workbookId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedVersion:data.version,snapshot})});const d=await r.json();if(r.status===409){setStatus("Có phiên bản mới hơn do nhân viên khác lưu. Hãy tải lại để tránh ghi đè.");return;}if(!r.ok)throw new Error(d.error||"Lưu thất bại");data.version=d.version;lastSaved=serialized;setStatus("Đã lưu lúc "+new Date().toLocaleTimeString());}finally{saving=false}};
  setSave(()=>saveNow);setStatus("Đã tải bảng tính");timer=setInterval(()=>{void saveNow().catch(err=>setStatus(err.message));},30000);
 }catch(err){setStatus(err instanceof Error?err.message:"Không thể khởi tạo Univer");}})();
 return()=>{alive=false;if(timer)clearInterval(timer);setSave(null);if(instance)queueMicrotask(()=>instance?.dispose());};
 },[workbookId]);
 return <section className="mt-4"><div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-600">{status}</p><button onClick={()=>save?.().catch(err=>setStatus(err.message))} className="rounded-lg bg-blue-900 text-white px-4 py-2 text-sm">Lưu ngay</button></div><div ref={host} className="h-[680px] bg-white border rounded-xl overflow-hidden"/></section>;
}
