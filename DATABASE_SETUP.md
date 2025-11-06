# Database Builder Setup Guide

## Overview
This is a no-code database builder that allows your clients (especially older, non-technical users) to create and manage simple databases through an easy-to-use interface.

## Prerequisites
1. Supabase account (free tier available)
2. Your Supabase project URL and anon key (already configured in `supabase-config.js`)

## Setup Steps

### 1. Create Database Schema in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `schema.sql`
4. Paste and run the SQL in the SQL Editor
5. This will create all necessary tables and security policies

**Important**: The schema includes:
- `client_databases` - Stores database definitions
- `client_tables` - Stores table schemas (field definitions)
- `table_metadata` - Tracks actual data tables
- `shared_databases` - For sharing databases with others
- `saved_views` - For saved filtered views

### 2. Configure Row Level Security (RLS)

The SQL schema automatically sets up RLS policies, but verify:
1. Go to **Authentication** → **Policies** in Supabase
2. Ensure all tables have RLS enabled
3. Policies should allow users to only access their own data

### 3. Set Up Dynamic Table Creation

**Important Note**: Creating tables dynamically requires either:
- A Supabase Edge Function (recommended for production)
- Or using the service role key (not recommended, security risk)

For now, the code uses RPC functions. You may need to:
1. Go to **Database** → **Functions** in Supabase
2. Create the functions from `schema.sql` (they're included in the SQL)

If you encounter permission issues, you may need to:
- Create an Edge Function for table creation
- Or temporarily use the service role key (only for development)

### 4. Test the Setup

1. Make sure you're logged in (via `supabase-config.js`)
2. Navigate to `Database.html`
3. Click "Create Your First Database"
4. Try creating a database from a template
5. Verify the database appears in the sidebar

## Features Implemented

✅ **Template System**
- 11 pre-built templates (Contacts, Recipes, Inventory, etc.)
- Templates include sample data

✅ **Database Creation Wizard**
- Step-by-step wizard interface
- Template selection or custom field builder
- Preview before creating

✅ **Data Management**
- Table view (spreadsheet-style)
- Form view (easier data entry)
- Inline editing
- Search and filter
- Sorting

✅ **UI Design**
- ChatGPT-inspired clean design
- Dark sidebar (#1a1a1a)
- White content area
- Large fonts for older users
- Simple, intuitive interface

## Features Still To Implement

⚠️ **Import Functionality** (Phase 4)
- Excel/CSV import
- Column mapping interface
- File validation

⚠️ **Views & Reports** (Phase 5)
- Custom filtered views
- Simple charts and reports
- Export to PDF

⚠️ **Sharing** (Phase 6)
- Share databases with others
- Permission levels
- Email invites

## File Structure

```
├── Database.html              # Main database builder page
├── schema.sql                 # Database schema (run in Supabase)
├── templates.js               # Template definitions
├── client-database-service.js # Database operations
├── database-builder.js        # Wizard for creating databases
├── database-list-sidebar.js   # Sidebar navigation
├── table-view.js              # Spreadsheet-style table view
├── form-view.js               # Form-based data entry
└── styles.css                 # ChatGPT-inspired styles
```

## Troubleshooting

### "User not authenticated" error
- Make sure you're logged in via the auth system
- Check `supabase-config.js` has correct credentials

### "Database service not available" error
- Ensure `client-database-service.js` is loaded before use
- Check browser console for load order

### "Table creation failed" error
- Verify RPC functions exist in Supabase
- Check RLS policies allow table creation
- May need to use Edge Function instead

### Tables not showing up
- Check browser console for errors
- Verify database was created in Supabase dashboard
- Refresh the page

## Security Notes

1. **Never expose service_role key** in frontend code
2. **RLS policies** ensure users only see their own data
3. **Input validation** is handled by Supabase
4. **Dynamic table creation** should use Edge Functions in production

## Next Steps

1. Test with sample data
2. Implement import functionality
3. Add views and reports
4. Add sharing features
5. Set up Edge Functions for table creation (production)

## Migration to AWS

When ready to self-host:
1. See `MIGRATION_GUIDE.md` (to be created)
2. Same PostgreSQL schema works on AWS RDS
3. Replace Supabase REST API with PostgREST or custom API
4. Use S3 for file storage
5. Update connection strings in config

## Support

For issues or questions:
- Check Supabase logs in dashboard
- Review browser console for errors
- Verify all scripts are loaded in correct order

