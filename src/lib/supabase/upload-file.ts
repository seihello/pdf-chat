import createClient from "@/lib/supabase/client";

export default async function uploadFile(sessionId: string, file: File) {
  const supabase = createClient();
  const filePath = `${sessionId}/${file.name}`;
  const uploadRes = await supabase.storage
    .from("files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadRes.error) throw new Error(uploadRes.error.message);

  const { data } = supabase.storage.from("files").getPublicUrl(filePath);
  return data.publicUrl;
}
