import {describe,it,expect} from "vitest";
import {registerSchema,productSchema} from "@/lib/validation";
describe("BIZWORK validation",()=>{
 it("requires long passwords before registration",()=>{expect(registerSchema.safeParse({name:"An",email:"an@example.com",password:"short"}).success).toBe(false);});
 it("accepts a pending employee registration payload",()=>{expect(registerSchema.safeParse({name:"An Nguyen",email:"an@example.com",password:"correct-horse-battery"}).success).toBe(true);});
 it("rejects negative sale prices",()=>{expect(productSchema.safeParse({sku:"KIT-01",name:"Japan Home",category:"shirt",salePriceJpy:-1}).success).toBe(false);});
 it("defaults missing cost price to zero",()=>{const r=productSchema.parse({sku:"KIT-02",name:"Japan Away",category:"shirt",salePriceJpy:5000});expect(r.costPriceJpy).toBe(0);});
});
