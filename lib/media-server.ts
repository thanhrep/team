import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSupabaseAdmin } from "./supabase-server";

export const mediaBucket = "teamspirit-media";

function safeName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-120) || "image"
  );
}

export async function saveMedia(file: File) {
  const extension = safeName(file.name).split(".").pop() || "bin";
  const objectName = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const existing = await supabase.storage.getBucket(mediaBucket);
    if (existing.error)
      await supabase.storage.createBucket(mediaBucket, {
        public: true,
        fileSizeLimit: "10MB",
      });
    const uploaded = await supabase.storage
      .from(mediaBucket)
      .upload(objectName, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploaded.error)
      throw new Error(`Không thể lưu ảnh: ${uploaded.error.message}`);
    return {
      url: supabase.storage.from(mediaBucket).getPublicUrl(objectName).data
        .publicUrl,
    };
  }
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}-${safeName(file.name)}`;
  await writeFile(join(uploadDir, filename), bytes);
  return { url: `/uploads/${filename}` };
}

export async function removeMedia(url: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !url.includes(`/storage/v1/object/public/${mediaBucket}/`))
    return;
  const path = url
    .split(`/storage/v1/object/public/${mediaBucket}/`)[1]
    ?.split("?")[0];
  if (path) {
    const result = await supabase.storage
      .from(mediaBucket)
      .remove([decodeURIComponent(path)]);
    if (result.error)
      throw new Error(`Không thể xóa ảnh: ${result.error.message}`);
  }
}
