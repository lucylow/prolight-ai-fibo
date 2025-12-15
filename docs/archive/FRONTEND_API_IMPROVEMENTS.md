# Frontend API Integration Improvements

This document outlines the comprehensive improvements made to the frontend integration of all Bria APIs.

## Overview

The frontend has been enhanced with:

- **Unified API client** with retry logic and better error handling
- **Enhanced status polling** with progress tracking and error recovery
- **Improved UI/UX** with progress indicators, better error messages, and download capabilities
- **Consistent patterns** across all API integrations

## Key Improvements

### 1. Enhanced Bria Client (`src/services/enhancedBriaClient.ts`)

**Features:**

- Automatic retry with exponential backoff
- Configurable timeout and retry attempts
- Better error handling and error message extraction
- Support for abort signals
- Enhanced polling with progress callbacks

**Benefits:**

- More reliable API calls
- Better user experience during network issues
- Consistent error handling across all APIs

### 2. Enhanced Status Hook (`src/hooks/useEnhancedStatus.ts`)

**Features:**

- Automatic status polling with configurable intervals
- Progress calculation based on elapsed time
- Error recovery with retry mechanism
- Callback support for completion, errors, and progress
- Cleanup on unmount to prevent memory leaks

**Benefits:**

- Real-time status updates
- Better user feedback
- Automatic error recovery

### 3. Ads Generation API (`src/pages/generate/AdsGenerator.tsx`)

**Improvements:**

- ✅ Enhanced status tracking with progress bar
- ✅ Automatic result extraction when job completes
- ✅ Download all functionality
- ✅ Better error messages
- ✅ Retry status check button
- ✅ Elapsed time display

**Features:**

- Real-time progress tracking
- Automatic asset display on completion
- Batch download capability

### 4. Image Onboarding (`src/components/ImageOnboarder.tsx`)

**Current State:**

- Already has comprehensive implementation
- Supports URL, org_image_key, and file upload
- Image preview functionality
- List of registered visuals

**Potential Future Enhancements:**

- Drag-and-drop file upload
- Batch image onboarding
- Progress indicators for file uploads

### 5. Video Editing (`src/pages/generate/VideoEditor.tsx`)

**Improvements:**

- ✅ Better SSE error handling
- ✅ Improved fallback to polling
- ✅ Enhanced error messages
- ✅ Better status display

**Features:**

- Server-Sent Events (SSE) for real-time updates
- Automatic fallback to polling if SSE fails
- Upload progress tracking
- Video preview and download

### 6. Tailored Generation (`src/pages/generate/TailoredGen.tsx`)

**Improvements:**

- ✅ Enhanced status polling integration
- ✅ Progress tracking with visual indicators
- ✅ Automatic result extraction
- ✅ Download all functionality
- ✅ Better error handling
- ✅ Retry mechanism

**Features:**

- Real-time status updates
- Progress bar showing estimated completion
- Automatic image display on completion

### 7. Product Shot Editing (`src/pages/generate/ProductEditor.tsx`)

**Improvements:**

- ✅ Enhanced status tracking
- ✅ Progress indicators
- ✅ Better onboarding flow
- ✅ Automatic result extraction
- ✅ Download all functionality
- ✅ Improved error messages

**Features:**

- Separate onboarding and editing states
- Real-time progress tracking
- Support for multiple operations (packshot, isolate, add_shadow, etc.)

### 8. Image Editing (`src/pages/generate/ImageEditor.tsx`)

**Improvements:**

- ✅ Enhanced status polling
- ✅ Progress tracking
- ✅ Better onboarding integration
- ✅ Automatic result extraction
- ✅ Download all functionality
- ✅ Improved error handling

**Features:**

- Support for multiple editing operations
- Real-time status updates
- Better user feedback

### 9. Image Generation

**Status:**

- Multiple implementations exist (ImageGeneration.tsx, ImageGenerationV2.tsx)
- Consider consolidating for consistency

**Recommendations:**

- Use enhanced client for all image generation endpoints
- Add status polling for async operations
- Implement progress tracking

## Status Service Improvements

### Enhanced Status Hook Features

1. **Automatic Polling**
   - Configurable poll interval (default: 2 seconds)
   - Maximum wait time (default: 5 minutes)
   - Automatic cleanup on unmount

2. **Progress Tracking**
   - Estimated progress based on elapsed time
   - Visual progress bar
   - Elapsed time display

3. **Error Recovery**
   - Automatic retry on errors
   - Configurable max retries
   - Manual retry button

4. **Callbacks**
   - `onComplete`: Called when job completes
   - `onError`: Called on errors
   - `onProgress`: Called on each status update

## Common Patterns

All improved components now follow these patterns:

1. **State Management**

   ```typescript
   const [jobId, setJobId] = useState<string>();
   const { status, isLoading, error, retry, progress, elapsedTime } =
     useEnhancedStatus(jobId, {
       onComplete: (status) => {
         /* handle completion */
       },
       onError: (error) => {
         /* handle error */
       },
     });
   ```

2. **Error Handling**

   ```typescript
   try {
     const res = await enhancedBriaClient.generateAds({...});
     if (res.request_id) {
       setJobId(res.request_id);
       toast.success("Generation started!");
     }
   } catch (error) {
     const errorMessage = extractErrorMessage(error);
     toast.error(errorMessage || "Operation failed");
   }
   ```

3. **Progress Display**

   ```typescript
   {isStatusLoading && (
     <div className="space-y-2">
       <Progress value={progress} />
       <p>Elapsed: {Math.floor(elapsedTime / 1000)}s</p>
     </div>
   )}
   ```

4. **Result Display**
   ```typescript
   {assets.length > 0 && (
     <div>
       <h2>Results ({assets.length})</h2>
       <Button onClick={downloadAll}>Download All</Button>
       <AssetGrid assets={assets} />
     </div>
   )}
   ```

## API Client Usage

### Basic Usage

```typescript
import { enhancedBriaClient } from "@/services/enhancedBriaClient";

// Generate ads
const result = await enhancedBriaClient.generateAds({
  brand_id: "nike_brand",
  template_id: "summer_sale",
  prompt: "Summer sale advertisement",
});

// Onboard image
const onboardResult = await enhancedBriaClient.onboardImage(
  "https://example.com/image.jpg",
);

// Edit image
const editResult = await enhancedBriaClient.editImage({
  asset_id: "asset-123",
  operation: "remove_background",
});

// Poll status
const status = await enhancedBriaClient.pollStatus("request-id", {
  pollInterval: 2000,
  maxWait: 300000,
  onProgress: (status) => console.log("Progress:", status),
});
```

### With Options

```typescript
// Custom retry and timeout
const result = await enhancedBriaClient.generateAds(
  { brand_id: "nike", template_id: "sale" },
  {
    retries: 5,
    retryDelay: 2000,
    timeout: 120000,
  },
);
```

## Error Handling

All APIs now provide consistent error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Client Errors (4xx)**: Immediate failure (no retry)
3. **Server Errors (5xx)**: Automatic retry
4. **Rate Limits (429)**: Automatic retry with backoff
5. **Timeouts**: Configurable timeout with abort signal support

## Status Polling

### Automatic Polling

```typescript
const { status, isLoading, progress } = useEnhancedStatus(jobId, {
  pollInterval: 2000, // Poll every 2 seconds
  maxWait: 300000, // Max 5 minutes
  autoStart: true, // Start automatically
  onComplete: (status) => {
    // Handle completion
  },
});
```

### Manual Control

```typescript
const { status, retry, cancel } = useEnhancedStatus(jobId, {
  autoStart: false,  // Don't start automatically
});

// Start manually
useEffect(() => {
  if (jobId) {
    // Status polling will start
  }
}, [jobId]);

// Retry on error
<Button onClick={retry}>Retry Status Check</Button>

// Cancel polling
<Button onClick={cancel}>Cancel</Button>
```

## Best Practices

1. **Always use enhanced client** for new integrations
2. **Use enhanced status hook** for async operations
3. **Provide user feedback** with progress indicators
4. **Handle errors gracefully** with clear messages
5. **Enable download functionality** for generated assets
6. **Show elapsed time** for long-running operations
7. **Provide retry mechanisms** for failed operations

## Migration Guide

### From Old API Client

**Before:**

```typescript
import { generateAds } from "@/api/bria";
const res = await generateAds({ brand_id: "nike" });
```

**After:**

```typescript
import { enhancedBriaClient } from "@/services/enhancedBriaClient";
const res = await enhancedBriaClient.generateAds({ brand_id: "nike" });
```

### From Old Status Hook

**Before:**

```typescript
import { useStatus } from "@/hooks/useStatus";
const { status } = useStatus(jobId);
```

**After:**

```typescript
import { useEnhancedStatus } from "@/hooks/useEnhancedStatus";
const { status, isLoading, progress, retry } = useEnhancedStatus(jobId, {
  onComplete: (status) => {
    /* handle */
  },
});
```

## Testing Recommendations

1. **Test retry logic** with network throttling
2. **Test error recovery** with various error scenarios
3. **Test status polling** with long-running jobs
4. **Test progress indicators** with different job durations
5. **Test download functionality** with multiple assets
6. **Test SSE fallback** for video editing

## Future Enhancements

1. **WebSocket Support**: Real-time updates via WebSocket
2. **Batch Operations**: Process multiple items at once
3. **Job Queue**: View and manage all active jobs
4. **History**: Track all past generations
5. **Presets**: Save and reuse common configurations
6. **Analytics**: Track API usage and performance

## Summary

All major API integrations have been improved with:

- ✅ Better error handling
- ✅ Retry mechanisms
- ✅ Progress tracking
- ✅ Status polling
- ✅ Download capabilities
- ✅ Consistent UI/UX
- ✅ Better user feedback

The frontend is now more robust, user-friendly, and maintainable.
