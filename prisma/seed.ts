import {PrismaClient,Role} from "@prisma/client";
import {hash} from "bcryptjs";
const db=new PrismaClient();
const templates=[
 "Danh mục sản phẩm","Thư viện ảnh sản phẩm","Nhập xuất tồn kho","Quản lý đơn hàng Nhật Bản","Danh sách khách hàng",
 "Giá vốn và lợi nhuận","Theo dõi nhà cung cấp","Báo cáo doanh thu","Kế hoạch sản xuất và đặt hàng","Theo dõi thiết kế áo team"
];
const permissions=[
 ["dashboard","view"],["workbooks","view"],["workbooks","edit"],["products","view"],["products","create"],["products","edit"],["products","delete"],
 ["media","view"],["media","upload"],["media","edit"],["media","delete"],["inventory","view"],["inventory","edit"],["orders","view"],["orders","edit"],
 ["customers","view"],["customers","edit"],["finance","view"],["finance","edit"],["users","view"],["users","approve"],["settings","edit"]
] as const;
async function main(){
 const email=process.env.BOOTSTRAP_ADMIN_EMAIL,password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
 if(!email||!password||password.length<16)throw new Error("Set bootstrap admin email and a unique 16+ character password.");
 let admin=await db.user.findUnique({where:{email:email.toLowerCase()}});
 if(!admin){admin=await db.user.create({data:{name:"BIZWORK Administrator",email:email.toLowerCase(),passwordHash:await hash(password,12),status:"APPROVED",role:"SUPER_ADMIN",approvedAt:new Date()}});console.log("Initial Super Admin created.");}
 const permissionIds=new Map<string,string>();
 for(const [module,action] of permissions){const permission=await db.permission.upsert({where:{module_action:{module,action}},update:{},create:{module,action}});permissionIds.set(module+"."+action,permission.id);}
 await db.rolePermission.deleteMany();
 const grants:Record<Role,string[]>={
  SUPER_ADMIN:permissions.map(([m,a])=>m+"."+a),
  ADMIN:permissions.filter(([m])=>m!=="settings").map(([m,a])=>m+"."+a),
  MANAGER:["dashboard.view","workbooks.view","workbooks.edit","products.view","products.create","products.edit","media.view","media.upload","media.edit","inventory.view","inventory.edit","orders.view","orders.edit","customers.view","customers.edit","finance.view"],
  STAFF:["dashboard.view","workbooks.view","workbooks.edit","products.view","media.view","media.upload","orders.view","orders.edit","customers.view"],
  VIEWER:["dashboard.view","workbooks.view","products.view","media.view","inventory.view","orders.view","customers.view","finance.view"]
 };
 for(const [role,keys] of Object.entries(grants) as [Role,string[]][]){for(const key of keys){const permissionId=permissionIds.get(key);if(permissionId)await db.rolePermission.create({data:{role,permissionId}});}}
 for(const name of templates){const exists=await db.workbook.findFirst({where:{name,ownerId:admin.id}});if(exists)continue;const snapshot={id:"bizwork-"+Date.now()+"-"+Math.random().toString(16).slice(2),name,locale:"enUS",styles:{},sheetOrder:["sheet-1"],sheets:{"sheet-1":{id:"sheet-1",name:"Sheet1",rowCount:200,columnCount:26,cellData:{}}}};await db.workbook.create({data:{name,ownerId:admin.id,versions:{create:{version:1,snapshot,createdBy:admin.id}},sheets:{create:{name:"Sheet1",position:0,data:{}}}}});}
 console.log("BIZWORK seed completed.");
}
main().finally(()=>db.$disconnect());
