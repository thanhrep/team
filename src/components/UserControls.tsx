"use client";
export default function UserControls({id,status}:{id:string,status:string}) {
  async function update(nextStatus:string) {
    const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:id,status:nextStatus})});
    if(!response.ok){const data=await response.json();alert(data.error||"Không cập nhật được tài khoản");return;}
    location.reload();
  }
  return <div className="flex gap-3"><button className="text-blue-800" onClick={()=>update("APPROVED")} disabled={status==="APPROVED"}>Duyệt</button><button className="text-red-600" onClick={()=>update("LOCKED")}>Khóa</button></div>;
}
