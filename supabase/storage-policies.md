# Supabase Storage Policies

These policies need to be created in the Supabase Dashboard under Storage → Policies.

## Bucket: files

### 1. Users can upload own files
- **Operation:** INSERT
- **Policy Definition:**
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 2. Users can view own files
- **Operation:** SELECT
- **Policy Definition:**
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 3. Users can update own files
- **Operation:** UPDATE
- **Policy Definition:**
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 4. Users can delete own files
- **Operation:** DELETE
- **Policy Definition:**
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

## File Path Structure

Files should be stored with the following path structure:
```
{user_id}/{file_id}/{filename}
```

This ensures:
- Files are organized by user
- Each file has a unique identifier
- The storage policies can properly restrict access based on the user_id in the path

