/**
 * ProcessingJob - Individual job card with real-time progress
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  Download, 
  Trash2,
  Video as VideoIcon,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PostProcessingJob } from '@/services/videoPostProcessingService';

interface ProcessingJobProps {
  job: PostProcessingJob;
  sseConnected: boolean;
  onRemove?: () => void;
}

const jobCard: React.CSSProperties = {
  borderLeft: '4px solid',
  transition: 'all 0.3s ease',
};

const jobHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const statusBadge = (status: PostProcessingJob['status']): { className: string } => {
  const colors: Record<string, string> = {
    complete: 'bg-green-500/20 text-green-600 border-green-500/30',
    error: 'bg-red-500/20 text-red-600 border-red-500/30',
    processing: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  };
  
  return {
    className: colors[status] || colors.pending,
  };
};

const progressContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '0.75rem',
};

const progressBar: React.CSSProperties = {
  flex: 1,
  height: '8px',
  borderRadius: '4px',
  transition: 'width 0.3s ease',
};

const sseWarning: React.CSSProperties = {
  marginTop: '0.5rem',
  padding: '0.5rem',
  background: 'hsl(var(--warning) / 0.1)',
  borderRadius: '6px',
  fontSize: '0.75rem',
  color: 'hsl(var(--warning-foreground))',
};

const previewVideo: React.CSSProperties = {
  width: '100%',
  maxHeight: '300px',
  borderRadius: '8px',
  marginTop: '1rem',
  border: '1px solid hsl(var(--border))',
};

const previewImage: React.CSSProperties = {
  width: '100%',
  maxHeight: '300px',
  objectFit: 'contain',
  borderRadius: '8px',
  marginTop: '1rem',
  border: '1px solid hsl(var(--border))',
};

export const ProcessingJob: React.FC<ProcessingJobProps> = ({ 
  job, 
  sseConnected,
  onRemove 
}) => {
  const getStatusColor = (status: PostProcessingJob['status']): string => {
    switch (status) {
      case 'complete':
        return 'hsl(142, 76%, 36%)'; // green
      case 'error':
        return 'hsl(0, 84%, 60%)'; // red
      case 'processing':
        return 'hsl(217, 91%, 60%)'; // blue
      default:
        return 'hsl(38, 92%, 50%)'; // yellow
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Loader2 className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        style={{
          ...jobCard,
          borderLeftColor: getStatusColor(job.status),
        }}
        className="hover:shadow-md transition-shadow"
      >
        <CardContent className="pt-6">
          {/* Header */}
          <div style={jobHeader}>
            <div className="flex items-center gap-3 flex-1">
              {job.type === 'video' ? (
                <VideoIcon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {job.fileName || job.input.split('/').pop()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {job.type.toUpperCase()} • {job.fileSize ? formatFileSize(job.fileSize) : 'Unknown size'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                className={statusBadge(job.status).className}
              >
                {job.status}
              </Badge>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={progressContainer}>
            <div className="flex-1">
              <Progress 
                value={job.progress} 
                className="h-2"
              />
            </div>
            <div className="flex items-center gap-2 min-w-[80px]">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {job.progress}%
              </span>
            </div>
          </div>

          {/* SSE Status Warning */}
          {!sseConnected && job.status === 'processing' && (
            <div style={sseWarning}>
              ⚠️ Reconnect SSE for live updates
            </div>
          )}

          {/* Output Preview */}
          {job.output && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Output:</p>
                <div className="flex gap-2">
                  {job.type === 'video' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const video = document.createElement('video');
                        video.src = job.output;
                        video.controls = true;
                        video.play();
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = job.output;
                      link.download = `processed_${job.fileName || 'file'}`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              {job.type === 'video' ? (
                <video
                  src={job.output}
                  style={previewVideo}
                  controls
                  className="w-full"
                />
              ) : (
                <img
                  src={job.output}
                  alt="Processed"
                  style={previewImage}
                  className="w-full"
                />
              )}
            </div>
          )}

          {/* Input Preview (if no output yet) */}
          {!job.output && job.input && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Input Preview:</p>
              {job.type === 'video' ? (
                <video
                  src={job.input}
                  style={previewVideo}
                  controls
                  className="w-full max-h-[200px]"
                />
              ) : (
                <img
                  src={job.input}
                  alt="Input"
                  style={previewImage}
                  className="w-full max-h-[200px]"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

