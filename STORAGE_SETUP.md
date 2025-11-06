# Storage Setup Guide

## Overview
This guide explains how to set up Supabase Storage buckets for file uploads in your application.

## Storage Buckets Required

The application uses the following storage buckets:

1. **avatars** - User profile pictures
2. **project-files** - Project attachments and documents
3. **documents** - General file uploads
4. **social-assets** - Social media assets

## Setup Steps

### 1. Create Storage Buckets

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket** for each bucket:

#### Avatars Bucket
- **Name**: `avatars`
- **Public bucket**: ✅ Yes (so profile pictures can be accessed)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/*`

#### Project Files Bucket
- **Name**: `project-files`
- **Public bucket**: ❌ No (private files)
- **File size limit**: 50 MB
- **Allowed MIME types**: `*/*` (all types)

#### Documents Bucket
- **Name**: `documents`
- **Public bucket**: ❌ No (private files)
- **File size limit**: 100 MB
- **Allowed MIME types**: `*/*` (all types)

#### Social Assets Bucket
- **Name**: `social-assets`
- **Public bucket**: ✅ Yes (for public sharing)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*, video/*`

### 2. Set Up Storage Policies

For each bucket, you need to set up Row Level Security policies:

#### Public Buckets (avatars, social-assets)

**Policy: Allow public read access**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars' OR bucket_id = 'social-assets');
```

#### Private Buckets (project-files, documents)

**Policy: Allow authenticated users to upload**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'project-files' OR bucket_id = 'documents')
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy: Allow users to read their own files**
```sql
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  (bucket_id = 'project-files' OR bucket_id = 'documents')
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy: Allow users to delete their own files**
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  (bucket_id = 'project-files' OR bucket_id = 'documents')
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Test Storage

You can test the storage service using the browser console:

```javascript
// Upload a file
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  const result = await window.storageService.uploadFile('avatars', file);
  console.log('Upload result:', result);
};
fileInput.click();
```

## Usage Examples

### Upload Avatar
```javascript
const fileInput = document.querySelector('#avatar-input');
const file = fileInput.files[0];
const userId = authManager.user.id;

const result = await window.storageService.uploadAvatar(file, userId);
if (!result.error) {
  // Update user profile with avatar URL
  await authManager.updateProfile({
    avatar_url: result.data.publicUrl
  });
}
```

### Upload Project File
```javascript
const file = document.querySelector('#file-input').files[0];
const projectId = 'project-uuid';

const result = await window.storageService.uploadProjectFile(file, projectId);
if (!result.error) {
  console.log('File uploaded:', result.data.publicUrl);
}
```

### Download File
```javascript
const { data, error } = await window.storageService.downloadFile(
  'project-files',
  'projects/project-uuid/file.pdf'
);

if (!error) {
  // Create download link
  const url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'file.pdf';
  a.click();
}
```

### Get Signed URL (for private files)
```javascript
const { data: signedUrl, error } = await window.storageService.getSignedUrl(
  'project-files',
  'projects/project-uuid/private-file.pdf',
  3600 // expires in 1 hour
);

if (!error) {
  window.open(signedUrl);
}
```

## File Organization

Files are organized in buckets as follows:

```
avatars/
  ├── {user-id}/
  │   └── avatar.jpg

project-files/
  ├── {project-id}/
  │   ├── document1.pdf
  │   ├── image1.png
  │   └── data.csv

documents/
  ├── {user-id}/
  │   └── personal-doc.pdf
  └── shared/
      └── shared-doc.pdf

social-assets/
  ├── images/
  │   └── post-image.jpg
  └── videos/
      └── post-video.mp4
```

## Security Best Practices

1. **Always validate file types** on both client and server
2. **Set appropriate file size limits** per bucket
3. **Use signed URLs** for private files instead of public URLs
4. **Implement virus scanning** for uploaded files (consider using Supabase Edge Functions)
5. **Regularly clean up** orphaned files
6. **Monitor storage usage** to avoid exceeding limits

## Troubleshooting

### "Storage bucket not found" error
- Ensure buckets are created in Supabase dashboard
- Check bucket names match exactly (case-sensitive)

### "Permission denied" error
- Check storage policies are set up correctly
- Verify user is authenticated
- Check file path matches policy conditions

### "File too large" error
- Check bucket file size limit
- Implement client-side file size validation
- Consider compressing files before upload

### Files not accessible
- For public buckets, check public access is enabled
- For private buckets, use signed URLs
- Check CORS settings if accessing from browser

## Cost Considerations

Supabase Storage pricing:
- **Free tier**: 1 GB storage, 2 GB bandwidth/month
- **Pro tier**: $0.021/GB storage, $0.09/GB bandwidth

Optimize costs by:
- Compressing images before upload
- Using CDN for frequently accessed files
- Implementing file cleanup for old/unused files
- Using appropriate bucket types (public vs private)

