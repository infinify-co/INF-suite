// Storage Service
// Handles file uploads and downloads using Supabase Storage

class StorageService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    this.supabase = window.supabase;
  }

  /**
   * Upload file to storage bucket
   */
  async uploadFile(bucket, file, path = null, options = {}) {
    try {
      const fileName = path || file.name;
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          ...options
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        data: {
          path: filePath,
          fullPath: data.path,
          publicUrl: urlData.publicUrl
        },
        error: null
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFileWithProgress(bucket, file, path = null, onProgress = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const chunkSize = 1024 * 1024; // 1MB chunks
          const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);
          let uploadedChunks = 0;

          // For now, upload in one go (Supabase handles this)
          // In production, you might want to implement chunked uploads
          const result = await this.uploadFile(bucket, file, path);
          
          if (result.error) {
            reject(result.error);
          } else {
            if (onProgress) {
              onProgress(100);
            }
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Download file from storage
   */
  async downloadFile(bucket, path) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { data: null, error };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket, path) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Get signed URL for private file
   */
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;

      return { data: data.signedUrl, error: null };
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket, path) {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { error };
    }
  }

  /**
   * List files in bucket
   */
  async listFiles(bucket, folder = '', options = {}) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
          ...options
        });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error listing files:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(file, userId) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Resize image if needed (optional - would need a library)
      const path = `avatars/${userId}`;
      const result = await this.uploadFile('avatars', file, path);

      if (result.error) throw result.error;

      return result;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload project file
   */
  async uploadProjectFile(file, projectId) {
    try {
      const path = `projects/${projectId}/${file.name}`;
      const result = await this.uploadFile('project-files', file, path);

      if (result.error) throw result.error;

      return result;
    } catch (error) {
      console.error('Error uploading project file:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(file, folder = '') {
    try {
      const path = folder ? `${folder}/${file.name}` : file.name;
      const result = await this.uploadFile('documents', file, path);

      if (result.error) throw result.error;

      return result;
    } catch (error) {
      console.error('Error uploading document:', error);
      return { data: null, error };
    }
  }

  /**
   * Create storage bucket (requires admin privileges)
   */
  async createBucket(bucketName, isPublic = false) {
    try {
      // Note: This requires service role key or admin API
      // For client-side, buckets should be created via Supabase dashboard
      console.warn('Bucket creation should be done via Supabase dashboard or admin API');
      return { error: new Error('Use Supabase dashboard to create buckets') };
    } catch (error) {
      console.error('Error creating bucket:', error);
      return { error };
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(bucket, path) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'));

      if (error) throw error;

      const fileName = path.split('/').pop();
      const exists = data?.some(file => file.name === fileName);
      
      return { exists, error: null };
    } catch (error) {
      console.error('Error checking file existence:', error);
      return { exists: false, error };
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}

// Make available globally
window.storageService = storageService;

