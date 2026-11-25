import {z} from "zod";
export const registerSchema=z.object({name:z.string().trim().min(2).max(100),email:z.email(),password:z.string().min(12).max(128)});
export const loginSchema=z.object({email:z.email(),password:z.string().min(1).max(128)});
export const productSchema=z.object({sku:z.string().trim().min(1).max(64),name:z.string().trim().min(1).max(200),category:z.string().min(1),salePriceJpy:z.coerce.number().min(0),costPriceJpy:z.coerce.number().min(0).default(0)});
