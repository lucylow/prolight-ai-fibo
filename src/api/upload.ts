import axios from "axios";

export async function getPresign(filename: string, contentType: string) {
  const { data } = await axios.post("/api/s3/presign", { 
    filename, 
    content_type: contentType 
  });
  return data;
}

export async function uploadToS3(
  uploadUrl: string, 
  file: File, 
  onProgress?: (progress: number) => void
) {
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    }
  });
}
