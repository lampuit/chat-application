export const MAX_CHAT_UPLOAD_BYTES = 1 * 1024 * 1024;

type UploadCandidate = {
  size: number;
  type: string;
};

export function validateChatUpload(file: UploadCandidate) {
  if (file.size > MAX_CHAT_UPLOAD_BYTES) {
    return "Files must be 1 MB or smaller.";
  }

  return null;
}
