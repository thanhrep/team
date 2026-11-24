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
 for(const [module,action] of permissions){const permission=await db.permission.upsert({where:{module_action:{module,action}},update:{},create:{module,action}});for(const role of Object.values(Role)){await db.rolePermission.upsert({where:{role_permissionId:{role,permissionId:permission.id}},update:{},create:{role,permissionId:permission.id}});}}
 for(const name of templates){const exists=await db.workbook.findFirst({where:{name,ownerId:admin.id}});if(exists)continue;const snapshot={id:"bizwork-"+Date.now()+"-"+Math.random().toString(16).slice(2),name,locale:"enUS",styles:{},sheetOrder:["sheet-1"],sheets:{"sheet-1":{id:"sheet-1",name:"Sheet1",rowCount:200,columnCount:26,cellData:{}}}};await db.workbook.create({data:{name,ownerId:admin.id,versions:{create:{version:1,snapshot,createdBy:admin.id}},sheets:{create:{name:"Sheet1",position:0,data:{}}}}});}
 console.log("BIZWORK seed completed.");
}
main().finally(()=>db.$disconnect());
