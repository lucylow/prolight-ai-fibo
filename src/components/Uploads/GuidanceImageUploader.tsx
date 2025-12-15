/**
 * GuidanceImageUploader - Component for uploading guidance images with S3 presigned URLs
 * Supports multiple images with progress tracking and thumbnails
 */
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { presignUpload, uploadToPresignedUrl } from "@/services/agentWorkflowService";
import type { GuidanceImage } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

interface GuidanceImageUploaderProps {
  onImagesUploaded: (images: GuidanceImage[]) => void;
  existingImages?: GuidanceImage[];
  maxImages?: number;
  className?: string;
  disabled?: boolean;
}

export const GuidanceImageUploader: React.FC<GuidanceImageUploaderProps> = ({
  onImagesUploaded,
  existingImages = [],
  maxImages = 10,
  className,
  disabled = false,
}) => {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [uploadedImages, setUploadedImages] = useState<GuidanceImage[]>(existingImages);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach((img) => {
        if (img.url.startsWith("blob:")) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remainingSlots = maxImages - uploadedImages.length;
      if (files.length > remainingSlots) {
        toast.error(`You can only upload ${remainingSlots} more image(s)`);
        return;
      }

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        const fileId = `${file.name}_${Date.now()}`;
        setUploads((prev) => {
          const next = new Map(prev);
          next.set(fileId, {
            file,
            progress: 0,
            status: "uploading",
          });
          return next;
        });

        try {
          // Get presigned URL
          const presignResponse = await presignUpload({
            filename: file.name,
            contentType: file.type,
            purpose: "guidance",
          });

          // Upload to S3
          await uploadToPresignedUrl(
            presignResponse.uploadUrl,
            file,
            presignResponse.fields
          );

          const guidanceImage: GuidanceImage = {
            url: presignResponse.publicUrl,
            key: presignResponse.publicUrl.split("/").pop() || file.name,
            filename: file.name,
            size: file.size,
          };

          setUploadedImages((prev) => {
            const updated = [...prev, guidanceImage];
            onImagesUploaded(updated);
            return updated;
          });

          setUploads((prev) => {
            const next = new Map(prev);
            const current = next.get(fileId);
            if (current) {
              next.set(fileId, {
                ...current,
                progress: 100,
                status: "completed",
              });
            }
            return next;
          });

          toast.success(`Uploaded ${file.name}`);
        } catch (error: any) {
          console.error("Upload failed:", error);
          const errorMessage =
            error.response?.data?.message || error.message || "Upload failed";
          
          setUploads((prev) => {
            const next = new Map(prev);
            const current = next.get(fileId);
            if (current) {
              next.set(fileId, {
                ...current,
                status: "error",
                error: errorMessage,
              });
            }
            return next;
          });

          toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [maxImages, uploadedImages.length, onImagesUploaded]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const image = uploadedImages[index];
      if (image.url.startsWith("blob:")) {
        URL.revokeObjectURL(image.url);
      }

      const updated = uploadedImages.filter((_, i) => i !== index);
      setUploadedImages(updated);
      onImagesUploaded(updated);
    },
    [uploadedImages, onImagesUploaded]
  );

  const activeUploads = Array.from(uploads.values()).filter(
    (u) => u.status === "uploading"
  );
  const errorUploads = Array.from(uploads.values()).filter(
    (u) => u.status === "error"
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploadedImages.length >= maxImages || activeUploads.length > 0}
          className="relative"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Guidance Images
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploadedImages.length >= maxImages || activeUploads.length > 0}
        />
        <span className="text-sm text-muted-foreground">
          {uploadedImages.length} / {maxImages} images
        </span>
      </div>

      {/* Active uploads */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((upload, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{upload.file.name}</span>
                <span>{upload.progress}%</span>
              </div>
              <Progress value={upload.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Error uploads */}
      {errorUploads.length > 0 && (
        <div className="space-y-1">
          {errorUploads.map((upload, index) => (
            <div
              key={index}
              className="p-2 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive"
            >
              <div className="font-medium">{upload.file.name}</div>
              <div className="text-xs">{upload.error}</div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded images grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadedImages.map((image, index) => (
            <div
              key={index}
              className="relative group aspect-square border rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={image.url}
                alt={image.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 bg-background rounded-full" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                {image.filename}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {uploadedImages.length === 0 && activeUploads.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No guidance images uploaded</p>
          <p className="text-xs mt-1">Upload images to guide the workflow</p>
        </div>
      )}
    </div>
  );
};
