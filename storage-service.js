// Storage Service
// Handles file uploads and downloads using Supabase Storage
// Enhanced with category support for organized file management

class StorageService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    this.supabase = window.supabase;
    this.categoryCache = new Map(); // Cache for category mappings
  }

  /**
   * Get category for a bucket
   */
  async getBucketCategory(bucketName) {
    try {
      // Check cache first
      if (this.categoryCache.has(bucketName)) {
        return this.categoryCache.get(bucketName);
      }

      const { data, error } = await this.supabase
        .from('storage_bucket_categories')
        .select('*, category:data_categories(*)')
        .eq('bucket_name', bucketName)
        .single();

      if (error) {
        console.warn(`No category mapping found for bucket: ${bucketName}`);
        return null;
      }

      // Cache the result
      this.categoryCache.set(bucketName, data);
      return data;
    } catch (error) {
      console.error('Error getting bucket category:', error);
      return null;
    }
  }

  /**
   * Generate organized file path based on category
   * Format: {category}/{user_id}/{item_type}/{item_id}/{filename}
   */
  async generateOrganizedPath(bucketName, userId, itemType, itemId, filename) {
    try {
      const bucketCategory = await this.getBucketCategory(bucketName);
      
      if (bucketCategory && bucketCategory.category) {
        const categorySlug = bucketCategory.category.slug || 'other';
        return `${categorySlug}/${userId}/${itemType}/${itemId}/${filename}`;
      }
      
      // Fallback to simple path if no category
      return `${userId}/${itemType}/${itemId}/${filename}`;
    } catch (error) {
      console.error('Error generating organized path:', error);
      // Fallback
      return `${userId}/${itemType}/${itemId}/${filename}`;
    }
  }

  /**
   * Store file metadata in database
   */
  async storeFileMetadata(fileMetadata) {
    try {
      const { data, error } = await this.supabase
        .from('file_metadata')
        .insert(fileMetadata)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error storing file metadata:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload file to storage bucket
   * @param {string} bucket - Bucket name
   * @param {File} file - File to upload
   * @param {string} path - Optional custom path
   * @param {object} options - Upload options
   * @param {object} categoryOptions - Category organization options
   * @param {string} categoryOptions.userId - User ID for path organization
   * @param {string} categoryOptions.itemType - Item type (e.g., 'site', 'agent', 'project')
   * @param {string} categoryOptions.itemId - Item ID
   * @param {string} categoryOptions.categoryId - Optional category ID override
   */
  async uploadFile(bucket, file, path = null, options = {}, categoryOptions = {}) {
    try {
      let filePath = path;
      
      // Generate organized path if category options provided
      if (categoryOptions.userId && categoryOptions.itemType && categoryOptions.itemId && !path) {
        filePath = await this.generateOrganizedPath(
          bucket,
          categoryOptions.userId,
          categoryOptions.itemType,
          categoryOptions.itemId,
          file.name
        );
      } else if (!filePath) {
        // Fallback to timestamp-based path
        const fileExt = file.name.split('.').pop();
        filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      }

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

      // Get bucket category for metadata
      const bucketCategory = await this.getBucketCategory(bucket);
      const categoryId = categoryOptions.categoryId || bucketCategory?.category_id || null;

      // Store file metadata if user ID is available
      if (categoryOptions.userId) {
        const fileMetadata = {
          user_id: categoryOptions.userId,
          category_id: categoryId,
          bucket_name: bucket,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_provider: 'supabase',
          public_url: urlData.publicUrl,
          metadata: {
            item_type: categoryOptions.itemType,
            item_id: categoryOptions.itemId
          }
        };

        // Try to store metadata (non-blocking)
        this.storeFileMetadata(fileMetadata).catch(err => {
          console.warn('Error storing file metadata:', err);
        });
      }

      // Trigger backup
      if (window.backupService) {
        window.backupService.backupFile(file, {
          originalLocation: bucket,
          storagePath: filePath,
          publicUrl: urlData.publicUrl
        }).catch(err => {
          console.warn('Error backing up file:', err);
        });
      }

      return {
        data: {
          path: filePath,
          fullPath: data.path,
          publicUrl: urlData.publicUrl,
          categoryId: categoryId
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
   * @param {string} bucket - Bucket name
   * @param {File} file - File to upload
   * @param {string} path - Optional custom path
   * @param {function} onProgress - Progress callback
   * @param {object} categoryOptions - Category organization options
   */
  async uploadFileWithProgress(bucket, file, path = null, onProgress = null, categoryOptions = {}) {
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
          const result = await this.uploadFile(bucket, file, path, {}, categoryOptions);
          
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
   * @param {File} file - File to upload
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID for category organization
   */
  async uploadProjectFile(file, projectId, userId = null) {
    try {
      // Get current user if not provided
      if (!userId && window.authManager?.user) {
        userId = window.authManager.user.id;
      }

      const categoryOptions = {
        userId: userId,
        itemType: 'project',
        itemId: projectId
      };

      const result = await this.uploadFile('project-files', file, null, {}, categoryOptions);

      if (result.error) throw result.error;

      return result;
    } catch (error) {
      console.error('Error uploading project file:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload document
   * @param {File} file - File to upload
   * @param {string} folder - Optional folder path
   * @param {object} categoryOptions - Category organization options
   */
  async uploadDocument(file, folder = '', categoryOptions = {}) {
    try {
      // Get current user if not provided
      if (!categoryOptions.userId && window.authManager?.user) {
        categoryOptions.userId = window.authManager.user.id;
      }

      let path = null;
      if (folder) {
        path = `${folder}/${file.name}`;
      }

      const result = await this.uploadFile('documents', file, path, {}, {
        ...categoryOptions,
        itemType: categoryOptions.itemType || 'document'
      });

      if (result.error) throw result.error;

      return result;
    } catch (error) {
      console.error('Error uploading document:', error);
      return { data: null, error };
    }
  }

  /**
   * Get files by category
   * @param {string} categorySlug - Category slug
   * @param {string} userId - User ID
   */
  async getFilesByCategory(categorySlug, userId) {
    try {
      const { data, error } = await this.supabase
        .from('file_metadata')
        .select(`
          *,
          category:data_categories!file_metadata_category_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('category.slug', categorySlug)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting files by category:', error);
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

