/**
 * VideoPostProcessing - Complete Video Post-Production Studio
 * 
 * Features:
 * - Background Removal (Bria remove_bg API)
 * - AI Upscaling (4K/8K super-resolution)
 * - Foreground Masking (Precise alpha channel control)
 * - Real-time SSE Progress (0-100% live updates)
 * - Batch Processing (10+ images/videos simultaneously)
 * - Video Export (MP4 with lighting animation)
 * - FIBO Integration (3D preview + lighting parameters)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Video, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Play,
  Download,
  Trash2,
  Sparkles,
  Wand2,
  Layers,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ProcessingJob } from './ProcessingJob';
import { MaskingControls } from './MaskingControls';
import { 
  createBatchJob, 
  subscribeToBatchProgress,
  type PostProcessingJob,
  type BatchJobRequest
} from '@/services/videoPostProcessingService';

const postProcessingContainer: React.CSSProperties = {
  minHeight: '100vh',
  padding: '2rem',
  background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted)))',
};

const uploadZone: React.CSSProperties = {
  border: '2px dashed hsl(var(--border))',
  borderRadius: '12px',
  padding: '3rem',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  background: 'hsl(var(--card))',
  position: 'relative',
  overflow: 'hidden',
};

const uploadZoneActive: React.CSSProperties = {
  ...uploadZone,
  borderColor: 'hsl(var(--primary))',
  background: 'hsl(var(--primary) / 0.05)',
};

const hiddenInput: React.CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  opacity: 0,
  pointerEvents: 'none',
};

const uploadFeatures: React.CSSProperties = {
  marginTop: '1rem',
  fontSize: '0.875rem',
  color: 'hsl(var(--muted-foreground))',
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const jobQueue: React.CSSProperties = {
  marginTop: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

interface VideoPostProcessingProps {
  onJobComplete?: (job: PostProcessingJob) => void;
  onBatchComplete?: (jobs: PostProcessingJob[]) => void;
  maxConcurrentJobs?: number;
}

export const VideoPostProcessing: React.FC<VideoPostProcessingProps> = ({
  onJobComplete,
  onBatchComplete,
  maxConcurrentJobs = 10,
}) => {
  const [jobs, setJobs] = useState<PostProcessingJob[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [maskMode, setMaskMode] = useState<'auto' | 'brush' | 'refine'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE Real-time Progress Connection
  useEffect(() => {
    if (jobs.length === 0) return;

    // Connect to batch SSE endpoint
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const jobIds = jobs.map(j => j.id).join(',');
      const eventSource = subscribeToBatchProgress(
        jobIds,
        (update) => {
          setJobs(prev => prev.map(job => {
            if (job.id === update.job_id) {
              const updated = {
                ...job,
                progress: update.progress || job.progress,
                status: update.status || job.status,
                ...(update.output && { output: update.output }),
              };
              
              // Call completion callback
              if (updated.status === 'complete' && onJobComplete) {
                onJobComplete(updated);
              }
              
              return updated;
            }
            return job;
          }));

          // Check if all jobs are complete
          const allComplete = jobs.every(j => 
            j.status === 'complete' || j.status === 'error'
          );
          if (allComplete && onBatchComplete) {
            onBatchComplete(jobs);
          }
        },
        (error) => {
          console.error('SSE connection error:', error);
          setSseConnected(false);
        }
      );

      eventSourceRef.current = eventSource;
      setSseConnected(true);
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [jobs.length, onJobComplete, onBatchComplete]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length === 0) {
      toast.error('Please select image or video files');
      return;
    }

    if (validFiles.length > maxConcurrentJobs) {
      toast.warning(`Maximum ${maxConcurrentJobs} files allowed. Processing first ${maxConcurrentJobs} files.`);
      validFiles.splice(maxConcurrentJobs);
    }

    // Create job entries
    const newJobs: PostProcessingJob[] = validFiles.map(file => ({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      progress: 0,
      input: URL.createObjectURL(file),
      output: '',
      type: file.type.startsWith('video') ? 'video' : 'image',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      maskMode: maskMode,
    }));

    setJobs(prev => [...prev, ...newJobs]);

    // Start batch processing
    try {
      const batchRequest: BatchJobRequest = {
        files: validFiles,
        operations: {
          removeBackground: true,
          upscale: true,
          mask: maskMode !== 'auto',
          maskMode: maskMode,
        },
      };

      await createBatchJob(batchRequest);
      toast.success(`Started processing ${validFiles.length} file(s)`);
    } catch (error) {
      console.error('Batch processing error:', error);
      toast.error('Failed to start batch processing');
      
      // Mark jobs as error
      setJobs(prev => prev.map(job => 
        newJobs.some(nj => nj.id === job.id) 
          ? { ...job, status: 'error' }
          : job
      ));
    }
  }, [maskMode, maxConcurrentJobs]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleRemoveJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  const handleClearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => 
      job.status !== 'complete' && job.status !== 'error'
    ));
  }, []);

  const completedCount = jobs.filter(j => j.status === 'complete').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;

  return (
    <div style={postProcessingContainer}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Video className="w-10 h-10" />
            Video Post-Production Studio
          </h1>
          <p className="text-muted-foreground text-lg">
            Professional video editing with AI-powered background removal, upscaling, and masking
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Badge variant="secondary" className="px-4 py-2">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {completedCount} Complete
          </Badge>
          <Badge variant="default" className="px-4 py-2">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {processingCount} Processing
          </Badge>
          {errorCount > 0 && (
            <Badge variant="destructive" className="px-4 py-2">
              <XCircle className="w-4 h-4 mr-2" />
              {errorCount} Errors
            </Badge>
          )}
          {!sseConnected && (
            <Badge variant="outline" className="px-4 py-2">
              ⚠️ SSE Disconnected
            </Badge>
          )}
        </motion.div>

        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Upload</CardTitle>
            <CardDescription>
              Drag and drop images/videos or click to select multiple files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={isDragging ? uploadZoneActive : uploadZone}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInput}
                style={hiddenInput}
              />
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="p-4 rounded-full bg-primary/10">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports images and videos (max {maxConcurrentJobs} files)
                  </p>
                </div>
              </motion.div>

              <div style={uploadFeatures}>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Background Removal
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  4K/8K Upscale
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  Foreground Masking
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Masking Controls */}
        {jobs.length > 0 && (
          <MaskingControls
            maskMode={maskMode}
            onMaskModeChange={setMaskMode}
          />
        )}

        {/* Job Queue */}
        {jobs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Processing Queue</CardTitle>
                <CardDescription>
                  {jobs.length} job(s) in queue
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCompleted}
                disabled={completedCount === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Completed
              </Button>
            </CardHeader>
            <CardContent>
              <div style={jobQueue}>
                <AnimatePresence>
                  {jobs.map((job) => (
                    <ProcessingJob
                      key={job.id}
                      job={job}
                      sseConnected={sseConnected}
                      onRemove={() => handleRemoveJob(job.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

