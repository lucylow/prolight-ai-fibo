import React, { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadResult {
  url: string;
  key: string;
  publicUrl?: string;
}

export interface S3PresignedUploaderProps {
  onComplete?: (result: UploadResult) => void;
  onProgress?: (progress: number) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

export default function S3PresignedUploader({
  onComplete,
  onProgress,
  accept,
  multiple = false,
  maxSize,
  className,
  disabled = false,
}: S3PresignedUploaderProps) {
  const { api } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
    }
    return null;
  };

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        setErrors((prev) => new Map(prev).set(file.name, validationError));
        return null;
      }

      try {
        setUploading(true);
        setProgress(0);
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(file.name);
          return next;
        });

        // Get presigned URL from backend
        const res = await api.post("/uploads/presign", {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });

        const { url, fields, key, publicUrl } = res.data;

        // If using multipart POST (fields present)
        if (fields) {
          const formData = new FormData();
          Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value as string);
          });
          formData.append("file", file);

          await axios.post(url, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (e) => {
              const percent = Math.round((e.loaded * 100) / (e.total || 1));
              setProgress(percent);
              onProgress?.(percent);
            },
          });
        } else {
          // Presigned PUT URL
          await axios.put(url, file, {
            headers: {
              "Content-Type": file.type,
            },
            onUploadProgress: (e) => {
              const percent = Math.round((e.loaded * 100) / (e.total || 1));
              setProgress(percent);
              onProgress?.(percent);
            },
          });
        }

        const result: UploadResult = {
          url: publicUrl || url.split("?")[0], // Remove query params for public URL
          key: key || file.name,
          publicUrl: publicUrl || url.split("?")[0],
        };

        setUploadedFiles((prev) => [...prev, result]);
        toast.success(`Uploaded ${file.name}`);
        onComplete?.(result);
        setProgress(0);
        return result;
      } catch (err: any) {
        console.error("Upload failed:", err);
        const errorMessage =
          err.response?.data?.message || err.message || "Upload failed";
        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        setErrors((prev) => new Map(prev).set(file.name, errorMessage));
        return null;
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [api, maxSize, onComplete, onProgress]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (!multiple && files.length > 1) {
        toast.error("Please select only one file");
        return;
      }

      for (const file of files) {
        await upload(file);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [upload, multiple]
  );

  const handleRemove = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="relative"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Choose Files"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        {uploading && (
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploaded Files:</p>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded-md"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm truncate">{file.key}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                className="ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {errors.size > 0 && (
        <div className="space-y-1">
          {Array.from(errors.entries()).map(([filename, error]) => (
            <p key={filename} className="text-sm text-destructive">
              {filename}: {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

