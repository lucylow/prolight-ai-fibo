import React from 'react';
import { VideoPostProcessing } from '@/components/VideoPostProcessing';

const VideoEditing = () => {
  return (
    <div className="min-h-screen pt-24 pb-12">
      <VideoPostProcessing
        maxConcurrentJobs={10}
        onJobComplete={(job) => {
          console.log('Job completed:', job);
        }}
        onBatchComplete={(jobs) => {
          console.log('Batch completed:', jobs);
        }}
      />
    </div>
  );
};

export default VideoEditing;


