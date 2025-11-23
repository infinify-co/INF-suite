// Data Organization Service
// Manages categories, folders, tags, and data organization
// Works with Supabase and ready for AWS migration

class DataOrganizationService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    this.supabase = window.supabase;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    if (window.authManager?.user) {
      return window.authManager.user.id;
    }
    if (window.cognitoAuthManager?.user) {
      return window.cognitoAuthManager.user.sub || window.cognitoAuthManager.user.username;
    }
    return null;
  }

  /**
   * Get all categories
   */
  async getCategories(parentId = null) {
    try {
      let query = this.supabase
        .from('data_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting categories:', error);
      return { data: null, error };
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug) {
    try {
      const { data, error } = await this.supabase
        .from('data_categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting category:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a data item and link it to a category
   * @param {object} itemData - Item data
   * @param {string} itemData.itemType - Type of item ('database', 'site', 'agent', etc.)
   * @param {string} itemData.itemId - ID of the item in its table
   * @param {string} itemData.itemTable - Table name where item exists
   * @param {string} itemData.name - Item name
   * @param {string} itemData.categorySlug - Category slug
   * @param {string} itemData.description - Optional description
   * @param {array} itemData.tags - Optional tags array
   */
  async createDataItem(itemData) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get category by slug
      const { data: category, error: categoryError } = await this.getCategoryBySlug(itemData.categorySlug);
      if (categoryError || !category) {
        throw new Error(`Category not found: ${itemData.categorySlug}`);
      }

      // Create data item
      const { data, error } = await this.supabase
        .from('data_items')
        .insert({
          user_id: userId,
          category_id: category.id,
          item_type: itemData.itemType,
          item_id: itemData.itemId,
          item_table: itemData.itemTable,
          name: itemData.name,
          description: itemData.description || null,
          tags: itemData.tags || []
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating data item:', error);
      return { data: null, error };
    }
  }

  /**
   * Get data items by category
   */
  async getDataItemsByCategory(categorySlug, userId = null) {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Get category
      const { data: category, error: categoryError } = await this.getCategoryBySlug(categorySlug);
      if (categoryError || !category) {
        throw new Error(`Category not found: ${categorySlug}`);
      }

      const { data, error } = await this.supabase
        .from('data_items')
        .select(`
          *,
          category:data_categories(*)
        `)
        .eq('user_id', currentUserId)
        .eq('category_id', category.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting data items by category:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a folder for organizing documents
   */
  async createFolder(name, parentId = null, color = null, icon = null) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('document_folders')
        .insert({
          user_id: userId,
          name: name,
          parent_id: parentId,
          color: color,
          icon: icon
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating folder:', error);
      return { data: null, error };
    }
  }

  /**
   * Get folders for current user
   */
  async getFolders(parentId = null) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      let query = this.supabase
        .from('document_folders')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting folders:', error);
      return { data: null, error };
    }
  }

  /**
   * Add item to folder
   */
  async addItemToFolder(dataItemId, folderId) {
    try {
      const { data, error } = await this.supabase
        .from('document_folder_items')
        .insert({
          folder_id: folderId,
          data_item_id: dataItemId
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error adding item to folder:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a tag
   */
  async createTag(name, color = null) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('document_tags')
        .insert({
          user_id: userId,
          name: name,
          color: color
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating tag:', error);
      return { data: null, error };
    }
  }

  /**
   * Get tags for current user
   */
  async getTags() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('document_tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting tags:', error);
      return { data: null, error };
    }
  }

  /**
   * Add tag to data item
   */
  async addTagToItem(dataItemId, tagId) {
    try {
      const { data, error } = await this.supabase
        .from('document_tag_items')
        .insert({
          tag_id: tagId,
          data_item_id: dataItemId
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error adding tag to item:', error);
      return { data: null, error };
    }
  }

  /**
   * Search data items
   * @param {string} query - Search query
   * @param {object} filters - Optional filters
   */
  async searchDataItems(query, filters = {}) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Use full-text search if available
      let searchQuery = this.supabase
        .from('document_search_index')
        .select(`
          *,
          data_item:data_items(*)
        `)
        .eq('data_item.user_id', userId)
        .textSearch('search_vector', query);

      // Apply filters
      if (filters.categorySlug) {
        const { data: category } = await this.getCategoryBySlug(filters.categorySlug);
        if (category) {
          searchQuery = searchQuery.eq('data_item.category_id', category.id);
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        searchQuery = searchQuery.contains('tags', filters.tags);
      }

      const { data, error } = await searchQuery.limit(50);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error searching data items:', error);
      // Fallback to simple search
      return this.simpleSearch(query, filters);
    }
  }

  /**
   * Simple search fallback
   */
  async simpleSearch(query, filters = {}) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      let searchQuery = this.supabase
        .from('data_items')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(50);

      if (filters.categorySlug) {
        const { data: category } = await this.getCategoryBySlug(filters.categorySlug);
        if (category) {
          searchQuery = searchQuery.eq('category_id', category.id);
        }
      }

      const { data, error } = await searchQuery;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error in simple search:', error);
      return { data: null, error };
    }
  }

  /**
   * Get data items by tags
   */
  async getDataItemsByTags(tagIds) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('document_tag_items')
        .select(`
          *,
          tag:document_tags(*),
          data_item:data_items(*)
        `)
        .in('tag_id', tagIds)
        .eq('data_item.user_id', userId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting data items by tags:', error);
      return { data: null, error };
    }
  }

  /**
   * Create document relationship
   */
  async createRelationship(sourceItemId, targetItemId, relationshipType, description = null) {
    try {
      const { data, error } = await this.supabase
        .from('document_relationships')
        .insert({
          source_item_id: sourceItemId,
          target_item_id: targetItemId,
          relationship_type: relationshipType,
          description: description
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating relationship:', error);
      return { data: null, error };
    }
  }

  /**
   * Get related items
   */
  async getRelatedItems(itemId, relationshipType = null) {
    try {
      let query = this.supabase
        .from('document_relationships')
        .select(`
          *,
          target_item:data_items!document_relationships_target_item_id_fkey(*)
        `)
        .eq('source_item_id', itemId);

      if (relationshipType) {
        query = query.eq('relationship_type', relationshipType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting related items:', error);
      return { data: null, error };
    }
  }

  /**
   * Update data item
   */
  async updateDataItem(itemId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('data_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating data item:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete data item
   */
  async deleteDataItem(itemId) {
    try {
      const { error } = await this.supabase
        .from('data_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting data item:', error);
      return { error };
    }
  }

  /**
   * Get storage usage by category
   */
  async getStorageUsageByCategory() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('storage_usage')
        .select(`
          *,
          category:data_categories(*)
        `)
        .eq('user_id', userId)
        .order('total_size', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { data: null, error };
    }
  }
}

// Create singleton instance
const dataOrganizationService = new DataOrganizationService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataOrganizationService;
}

// Make available globally
window.dataOrganizationService = dataOrganizationService;

