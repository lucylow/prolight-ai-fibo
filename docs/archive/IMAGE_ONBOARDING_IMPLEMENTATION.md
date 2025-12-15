# Bria Image Onboarding API Integration

This document describes the implementation of Bria's Image Onboarding API integration in ProLight AI.

## Overview

The Image Onboarding API allows registering images to Bria without database storage, providing a `visual_id` needed for AI Search and Image Editing Create endpoints.

## Implementation Details

### Backend (FastAPI/Python)

#### 1. Database Model

**File:** `backend/app/models/bria_visual.py`

SQLAlchemy model for storing visual_id mappings:

- Stores `visual_id` from Bria API
- Tracks source (s3, url, org_key)
- Stores original image URL, org_image_key, or S3 key
- Supports optional expiry dates
- Tracks removal status

#### 2. BriaClient Methods

**File:** `backend/clients/bria_client.py`

Added two new methods:

- `register_image()` - Registers images using v1 Image Onboarding API endpoint
- `remove_image()` - Removes images from organization gallery

These methods use the v1 API endpoint (`https://engine.prod.bria-api.com/v1`) instead of the v2 endpoints.

#### 3. API Routes

**File:** `backend/app/api/image_onboarding.py`

FastAPI routes:

- `POST /api/image/register` - Register image by URL or org_image_key
- `POST /api/image/register-s3-url` - Register existing S3 URL
- `POST /api/image/remove` - Remove image from organization gallery
- `GET /api/image/list` - List all registered visuals

#### 4. S3 Integration

**File:** `backend/app/api/s3.py`

Added `POST /api/s3/presign-image` endpoint for generating presigned URLs for image uploads.

### Frontend (React/TypeScript)

#### 1. ImageOnboarder Component

**File:** `src/components/ImageOnboarder.tsx`

React component with:

- Three registration modes:
  - **By URL**: Register using public image URL
  - **By org_image_key**: Register using internal image ID
  - **Upload File**: Upload to S3 and register
- Image preview for URL and file upload modes
- List of registered visuals with remove functionality
- Support for private/public images
- Optional expiry hours

#### 2. Image Onboarding Page

**File:** `src/pages/bria/ImageOnboarding.tsx`

Page component that wraps ImageOnboarder with MainLayout.

**Route:** `/bria/image-onboarding`

## Usage

### Register Image by URL

```typescript
const response = await api.post("/api/image/register", {
  image_url: "https://example.com/image.jpg",
  is_private: true,
  expire_hours: 24, // optional
});

const visual_id = response.data.visual_id;
```

### Register Image by org_image_key

```typescript
const response = await api.post("/api/image/register", {
  org_image_key: "internal-image-id-123",
  is_private: true,
});

const visual_id = response.data.visual_id;
```

### Upload File and Register

1. Get presigned URL:

```typescript
const presignResp = await api.post("/api/s3/presign-image", {
  filename: "image.jpg",
  content_type: "image/jpeg",
  make_public: true,
});
```

2. Upload to S3:

```typescript
await fetch(presignResp.data.upload_url, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": "image/jpeg" },
});
```

3. Register S3 URL:

```typescript
const response = await api.post("/api/image/register-s3-url", {
  image_url: presignResp.data.public_url,
  is_private: true,
});
```

### Remove Image

```typescript
await api.post("/api/image/remove", {
  visual_id: "9ea9a4d2d19977a7c",
  delete_s3: false, // optionally delete from S3
});
```

### List Registered Images

```typescript
const response = await api.get("/api/image/list", {
  params: { removed: false }, // filter by removal status
});

const visuals = response.data;
```

## Environment Variables

Required environment variables:

- `BRIA_API_TOKEN` - Bria API token for Image Onboarding API
- `AWS_ACCESS_KEY_ID` - AWS credentials (for S3 uploads)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET` - S3 bucket name for uploads
- `S3_REGION` - AWS region (default: us-east-1)

## Constraints

- Files must not exceed 12MB (status 413 returned if exceeded)
- Only JPEG and PNG files supported (RGB, RGBA, or CMYK color modes)
- Status 415 returned for unsupported file types or color modes
- Image URLs must be publicly accessible (unless using org_image_key with authentication)

## Database Migration

The `bria_visuals` table will be created automatically when the application starts (via SQLAlchemy Base.metadata.create_all).

## Accessing the UI

Navigate to `/bria/image-onboarding` in your application to access the Image Onboarding interface.

## Next Steps

1. Use `visual_id` for AI Search endpoints
2. Use `visual_id` for Image Editing Create endpoints
3. Implement background cleanup job for expired visuals
4. Add webhook support for Bria events (optional)
