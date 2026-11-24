import type {User} from "@prisma/client";
import {db} from "@/lib/prisma";
export async function hasPermission(user:Pick<User,"id"|"role">,module:string,action:string):Promise<boolean>{
 if(user.role==="SUPER_ADMIN")return true;
 const grant=await db.rolePermission.findFirst({where:{role:user.role,permission:{module,action}},select:{permissionId:true}});
 return Boolean(grant);
}
