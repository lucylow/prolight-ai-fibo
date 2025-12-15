import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { getPresignedUploadUrl, uploadToPresignedUrl, type GuidanceImage } from "@/api/text-to-image";

interface GuidanceImageFile {
  file: File;
  url?: string;
  role: "reference" | "style" | "texture";
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface GuidanceUploaderProps {
  images: GuidanceImage[];
  onChange: (images: GuidanceImage[]) => void;
  maxImages?: number;
}

export function GuidanceUploader({
  images,
  onChange,
  maxImages = 5,
}: GuidanceUploaderProps) {
  const [files, setFiles] = useState<GuidanceImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const acceptedFiles = Array.from(selectedFiles).filter((file) =>
      file.type.startsWith("image/")
    );

    const newFiles = acceptedFiles.slice(0, maxImages - files.length).map((file) => ({
      file,
      role: "reference" as const,
      uploading: true,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (const fileItem of newFiles) {
      try {
        // Get presigned URL
        const presignRes = await getPresignedUploadUrl({
          filename: fileItem.file.name,
          content_type: fileItem.file.type || "image/png",
          purpose: "guidance",
        });

        // Upload to S3
        await uploadToPresignedUrl(presignRes.upload_url, fileItem.file, (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileItem.file ? { ...f, progress } : f
            )
          );
        });

        // Update with public URL
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileItem.file
              ? { ...f, url: presignRes.public_url, uploading: false, progress: 100 }
              : f
          )
        );

        // Update images array
        onChange([
          ...images,
          { url: presignRes.public_url, role: fileItem.role },
        ]);
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileItem.file
              ? { ...f, uploading: false, error: String(error) }
              : f
          )
        );
      }
    }
  }, [files.length, maxImages, images, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onChange(
      newFiles
        .filter((f) => f.url)
        .map((f) => ({ url: f.url!, role: f.role }))
    );
  };

  const updateRole = (index: number, role: "reference" | "style" | "texture") => {
    const newFiles = files.map((f, i) => (i === index ? { ...f, role } : f));
    setFiles(newFiles);
    onChange(
      newFiles
        .filter((f) => f.url)
        .map((f) => ({ url: f.url!, role: f.role }))
    );
  };

  return (
    <div className="space-y-4">
      <Label>Guidance Images</Label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${files.length >= maxImages ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={files.length >= maxImages}
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop images here"
            : files.length >= maxImages
            ? `Maximum ${maxImages} images`
            : "Drag & drop images, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, WEBP up to {maxImages} images
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((fileItem, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-4 space-y-2">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  {fileItem.url ? (
                    <img
                      src={fileItem.url}
                      alt={`Guidance ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {fileItem.uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  {fileItem.uploading && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                      {Math.round(fileItem.progress || 0)}%
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {fileItem.error ? (
                  <p className="text-xs text-destructive">{fileItem.error}</p>
                ) : (
                  <Select
                    value={fileItem.role}
                    onValueChange={(value: "reference" | "style" | "texture") =>
                      updateRole(index, value)
                    }
                    disabled={!fileItem.url}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="style">Style</SelectItem>
                      <SelectItem value="texture">Texture</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

