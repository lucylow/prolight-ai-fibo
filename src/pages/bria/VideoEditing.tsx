import React from 'react';
import { VideoPostProcessing } from '@/components/VideoPostProcessing';

const VideoEditing = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [assetId, setAssetId] = useState('');
  const [operation, setOperation] = useState<string>('increase_resolution');
  const [resultVideo, setResultVideo] = useState<string | null>(null);

  const { editVideo, isLoading } = useBria();

  const operations = [
    { value: 'increase_resolution', label: 'Increase Resolution (8K Upscale)' },
    { value: 'remove_background', label: 'Remove Background' },
    { value: 'enhance', label: 'Enhance Quality' },
    { value: 'foreground_mask', label: 'Foreground Masking' },
  ];

  const handleOnboard = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    // Note: Video onboarding might use a different endpoint
    // For now, we'll assume the asset_id is provided or obtained separately
    toast.info('Video onboarding typically requires backend API. Please use the video asset ID directly.');
  };

  const handleEdit = async () => {
    if (!assetId) {
      toast.error('Please provide a video asset ID');
      return;
    }

    try {
      const result = await editVideo({
        asset_id: assetId,
        operation,
        params: {},
      });

      if (result.request_id) {
        toast.success('Video edit started! Monitor status for completion.');
        // In a real implementation, you would poll for results
      }
    } catch (error) {
      console.error('Video edit error:', error);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Video className="w-8 h-8" />
            Video Editing
          </h1>
          <p className="text-muted-foreground text-lg">
            Transform video content with advanced AI capabilities
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Video Editor</CardTitle>
              <CardDescription>
                Edit videos with upscaling, background removal, and enhancement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (for reference)</Label>
                <div className="flex gap-2">
                  <Input
                    id="videoUrl"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <Button onClick={handleOnboard} disabled={isLoading || !videoUrl.trim()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Reference
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetId">Video Asset ID</Label>
                <Input
                  id="assetId"
                  placeholder="Enter Bria video asset ID"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Video must be onboarded to Bria first. Use the backend API to onboard videos.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation">Edit Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger id="operation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleEdit}
                disabled={isLoading || !assetId}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply Edit
                  </>
                )}
              </Button>

              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Available Operations:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Increase Resolution:</strong> Upscale to 8K resolution</li>
                    <li><strong>Remove Background:</strong> Remove video background</li>
                    <li><strong>Enhance:</strong> Improve video quality</li>
                    <li><strong>Foreground Mask:</strong> Create foreground masks</li>
                  </ul>
                </p>
                <p className="text-xs mt-2">
                  <strong>Note:</strong> Video editing is asynchronous. Monitor job status via the status endpoint.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Edited video will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultVideo ? (
                <video
                  src={resultVideo}
                  controls
                  className="w-full rounded-lg border"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <Video className="w-16 h-16 mb-4 opacity-50" />
                  <p>Edited video will appear here</p>
                  <p className="text-sm mt-2">
                    Check job status to retrieve completed video
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoEditing;


