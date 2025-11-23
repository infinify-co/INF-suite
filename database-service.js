// General Database Service
// CRUD operations for all entities (teams, projects, todos, notes, etc.)

class DatabaseService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    this.supabase = window.supabase;
  }

  // ========== TEAMS ==========

  async getTeams() {
    try {
      const { data, error } = await this.supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching teams:', error);
      return { data: null, error };
    }
  }

  async getTeam(teamId) {
    try {
      const { data, error } = await this.supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching team:', error);
      return { data: null, error };
    }
  }

  async createTeam(name, description = '') {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('teams')
        .insert([{ name, description, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating team:', error);
      return { data: null, error };
    }
  }

  async updateTeam(teamId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating team:', error);
      return { data: null, error };
    }
  }

  async deleteTeam(teamId) {
    try {
      const { error } = await this.supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting team:', error);
      return { error };
    }
  }

  // ========== TEAM MEMBERS ==========

  async getTeamMembers(teamId) {
    try {
      const { data, error } = await this.supabase
        .from('team_members')
        .select('*, profiles(*)')
        .eq('team_id', teamId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching team members:', error);
      return { data: null, error };
    }
  }

  async addTeamMember(teamId, userId, role = 'member') {
    try {
      const { data, error } = await this.supabase
        .from('team_members')
        .insert([{ team_id: teamId, user_id: userId, role }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error adding team member:', error);
      return { data: null, error };
    }
  }

  async removeTeamMember(teamId, userId) {
    try {
      const { error } = await this.supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error removing team member:', error);
      return { error };
    }
  }

  // ========== PROJECTS ==========

  /**
   * Get projects
   * @param {string} teamId - Optional team ID filter
   * @param {string} categorySlug - Optional category filter
   */
  async getProjects(teamId = null, categorySlug = null) {
    try {
      let query = this.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by category if specified and organization service is available
      if (categorySlug && window.dataOrganizationService && data) {
        try {
          const { data: { user } } = await this.supabase.auth.getUser();
          if (user) {
            const { data: categoryItems } = await window.dataOrganizationService.getDataItemsByCategory('projects', user.id);
            
            if (categoryItems) {
              const categoryItemIds = new Set(categoryItems.map(item => item.item_id));
              return { data: data.filter(project => categoryItemIds.has(project.id)), error: null };
            }
          }
        } catch (orgError) {
          console.warn('Error filtering projects by category:', orgError);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching projects:', error);
      return { data: null, error };
    }
  }

  async getProject(projectId) {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching project:', error);
      return { data: null, error };
    }
  }

  async createProject(name, description, clientName, teamId = null, status = 'active', tags = []) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('projects')
        .insert([{
          name,
          description,
          client_name: clientName,
          team_id: teamId,
          status,
          progress: 0,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Create data item for categorization (if organization service is available)
      if (data && window.dataOrganizationService) {
        try {
          await window.dataOrganizationService.createDataItem({
            itemType: 'project',
            itemId: data.id,
            itemTable: 'projects',
            name: data.name,
            categorySlug: 'projects',
            description: data.description || `Project: ${data.name}`,
            tags: tags
          });
        } catch (orgError) {
          console.warn('Error creating data item for project:', orgError);
          // Non-blocking - project creation succeeded
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error creating project:', error);
      return { data: null, error };
    }
  }

  async updateProject(projectId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating project:', error);
      return { data: null, error };
    }
  }

  async deleteProject(projectId) {
    try {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { error };
    }
  }

  // ========== TODOS ==========

  async getTodos(userId = null) {
    try {
      let query = this.supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
          query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching todos:', error);
      return { data: null, error };
    }
  }

  async createTodo(content, userId = null) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user && !userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('todos')
        .insert([{ content, user_id: userId || user.id, completed: false }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating todo:', error);
      return { data: null, error };
    }
  }

  async updateTodo(todoId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('todos')
        .update(updates)
        .eq('id', todoId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating todo:', error);
      return { data: null, error };
    }
  }

  async deleteTodo(todoId) {
    try {
      const { error } = await this.supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting todo:', error);
      return { error };
    }
  }

  // ========== NOTES ==========

  async getNotes(userId = null) {
    try {
      let query = this.supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
          query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching notes:', error);
      return { data: null, error };
    }
  }

  async createNote(title, content, userId = null) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user && !userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('notes')
        .insert([{ title, content, user_id: userId || user.id }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating note:', error);
      return { data: null, error };
    }
  }

  async updateNote(noteId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating note:', error);
      return { data: null, error };
    }
  }

  async deleteNote(noteId) {
    try {
      const { error } = await this.supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting note:', error);
      return { error };
    }
  }

  // ========== PERFORMANCE METRICS ==========

  async getPerformanceMetrics(teamId = null, startDate = null, endDate = null) {
    try {
      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      if (startDate) {
        query = query.gte('recorded_at', startDate);
      }

      if (endDate) {
        query = query.lte('recorded_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return { data: null, error };
    }
  }

  async createPerformanceMetric(metricType, value, teamId = null) {
    try {
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .insert([{
          metric_type: metricType,
          value,
          team_id: teamId,
          recorded_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating performance metric:', error);
      return { data: null, error };
    }
  }

  // ========== APP SLOTS ==========

  async getAppSlots(userId = null) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user && !userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('app_slots')
        .select('*')
        .eq('user_id', userId || user.id)
        .order('slot_number', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching app slots:', error);
      return { data: null, error };
    }
  }

  async updateAppSlot(slotNumber, appName, appDetails, iconUrl = null) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('app_slots')
        .upsert({
          user_id: user.id,
          slot_number: slotNumber,
          app_name: appName,
          app_details: appDetails,
          icon_url: iconUrl
        }, {
          onConflict: 'user_id,slot_number'
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating app slot:', error);
      return { data: null, error };
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatabaseService;
}

// Make available globally
window.databaseService = databaseService;

