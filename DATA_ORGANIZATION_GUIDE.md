# Data Organization & AWS Migration Guide

## Overview

This implementation organizes all user documents and data in Supabase into logical categories, making it ready for a smooth transition to AWS RDS PostgreSQL.

## What Was Implemented

### 1. Database Migrations

Five SQL migration files were created in `backend/database/migrations/`:

- **create_data_categories.sql** - Main categorization system with hierarchical categories
- **create_storage_organization.sql** - Storage bucket mapping and file organization
- **create_document_organization.sql** - Document tags, folders, and relationships
- **create_category_tables.sql** - Organizes tables into logical PostgreSQL schemas
- **create_aws_migration_helpers.sql** - Migration tracking and export functions

### 2. Services Updated

- **storage-service.js** - Enhanced with category support for file uploads
- **data-organization-service.js** - New service for managing categories, folders, and tags
- **sites-service.js** - Integrated with category system
- **agents-service.js** - Integrated with category system
- **database-service.js** - Integrated with category system for projects

## How to Use

### Step 1: Run Migrations in Supabase

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `create_data_categories.sql`
   - `create_storage_organization.sql`
   - `create_document_organization.sql`
   - `create_category_tables.sql`
   - `create_aws_migration_helpers.sql`

### Step 2: Use Categories in Your Code

#### Creating a Site with Category

```javascript
const siteConfig = {
  siteName: 'My Website',
  deploymentType: 'static',
  tags: ['production', 'client-project']
};

const result = await sitesService.createSite(siteConfig);
// Automatically creates a data item in the 'sites' category
```

#### Creating an Agent with Category

```javascript
const agentConfig = {
  name: 'Customer Support Bot',
  instructions: 'Help customers with questions',
  tags: ['support', 'chatbot']
};

const result = await agentsService.createAgent(agentConfig);
// Automatically creates a data item in the 'agents' category
```

#### Organizing Files by Category

```javascript
// Upload file with category organization
const result = await storageService.uploadFile(
  'documents',
  file,
  null,
  {},
  {
    userId: user.id,
    itemType: 'project',
    itemId: projectId
  }
);
// File path will be: {category}/{user_id}/{item_type}/{item_id}/{filename}
```

#### Using Data Organization Service

```javascript
// Get all items in a category
const { data } = await dataOrganizationService.getDataItemsByCategory('sites');

// Create a folder
const { data: folder } = await dataOrganizationService.createFolder('My Documents');

// Add item to folder
await dataOrganizationService.addItemToFolder(dataItemId, folder.id);

// Create and add tags
const { data: tag } = await dataOrganizationService.createTag('Important', '#FF0000');
await dataOrganizationService.addTagToItem(dataItemId, tag.id);

// Search items
const { data: results } = await dataOrganizationService.searchDataItems('website', {
  categorySlug: 'sites',
  tags: ['production']
});
```

## Category Structure

### Default Categories

- **Documents** - All user documents and files
- **Databases** - No-code database builder projects
- **Sites** - Deployed websites and applications
- **Agents** - AI agents and automations
- **Projects** - Projects and team collaborations
- **Code** - Code files and repositories
- **Images** - Images and graphics
- **Videos** - Video files
- **Archives** - Compressed files and archives
- **Other** - Uncategorized items

### Storage Bucket Mappings

- `avatars` → Images category
- `project-files` → Documents category
- `documents` → Documents category
- `social-assets` → Images category

## File Organization

Files are automatically organized using this path structure:
```
{category}/{user_id}/{item_type}/{item_id}/{filename}
```

Example:
```
sites/123e4567-e89b-12d3-a456-426614174000/site/abc-123/index.html
```

## Schema Organization

Tables are organized into logical schemas:

- **core** - Users, profiles, authentication
- **databases** - Client databases, tables, metadata
- **projects** - Teams, projects, todos, notes
- **sites** - Sites, deployments, analytics
- **agents** - Agents, versions, logs
- **storage** - File metadata, storage buckets
- **organization** - Categories, data items, organization

Backward compatibility views are created in the `public` schema, so existing code continues to work.

## AWS Migration

### Migration Functions

The migration helpers provide functions to export data:

```sql
-- Export all user data
SELECT export_user_data('user-id-here');

-- Export specific table
SELECT export_table_data('sites', 'sites', 'status = ''live''');

-- Create migration record
SELECT create_migration('migration-name', 'supabase', 'aws_rds');

-- Check migration status
SELECT * FROM get_migration_status('migration-name');
```

### Migration Process

1. **Export Data**: Use `export_user_data()` to export all user data
2. **Export Files**: Export file metadata, then migrate files from Supabase Storage to S3
3. **Import to AWS RDS**: Import exported JSON data into AWS RDS PostgreSQL
4. **Update Services**: Point services to AWS endpoints

## Benefits

✅ **Organized**: All user data clearly categorized  
✅ **Searchable**: Full-text search across documents  
✅ **Scalable**: Add new categories without schema changes  
✅ **Migration Ready**: Direct path to AWS RDS  
✅ **User-Friendly**: Users can organize with folders and tags  
✅ **Backward Compatible**: Existing code continues to work

## Next Steps

1. Run the migrations in Supabase
2. Test category creation with your existing data
3. Start using the organization service in your UI
4. When ready, use migration helpers to export data for AWS

## Support

For questions or issues:
- Check migration logs in `migration_logs` table
- Review migration status in `migration_metadata` table
- Use `migration_summary` view for overview

