import { put } from "@vercel/blob";

const MAX_CHAT_MEDIA_BYTES = 8 * 1024 * 1024;

export async function uploadChatMedia(file: File): Promise<string | null> {
  if (file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be shared in chat.");
  }
  if (file.size > MAX_CHAT_MEDIA_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const { url } = await put(`chat/${crypto.randomUUID()}.${ext}`, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return url;
}
