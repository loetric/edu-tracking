-- ============================================
-- SETUP STORAGE BUCKET POLICIES FOR FILES
-- ============================================
-- This script sets up storage bucket policies for file uploads
-- IMPORTANT: You must create the bucket "files" in Supabase Storage first!
-- Go to: Storage > Create Bucket > Name: "files" > Public: Yes/No (your choice)

-- Note: Storage policies are different from RLS policies
-- Storage policies control file access in Supabase Storage
-- RLS policies control database table access

-- ============================================
-- STEP 1: Create the bucket (if it doesn't exist)
-- ============================================
-- You need to do this manually in Supabase Dashboard:
-- 1. Go to Storage
-- 2. Click "Create Bucket"
-- 3. Name: "files"
-- 4. Public: Yes (if you want public access) or No (if you want authenticated access only)
-- 5. Click "Create"

-- ============================================
-- STEP 2: Storage Bucket Policies
-- ============================================
-- These policies control who can upload/download files from the bucket

-- Policy 1: Allow admins to upload files
-- Only admins can upload files to the bucket
CREATE POLICY "Allow admin uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'files' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Policy 2: Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'files' AND
        auth.role() = 'authenticated'
    );

-- Policy 3: Allow admins to update files
CREATE POLICY "Allow admin updates" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'files' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Policy 4: Allow admins to delete files
CREATE POLICY "Allow admin deletes" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'files' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Storage bucket policies created successfully!';
    RAISE NOTICE '⚠️ IMPORTANT: Make sure you have created the "files" bucket in Supabase Storage Dashboard first!';
    RAISE NOTICE '⚠️ If the bucket is public, you may want to adjust the SELECT policy above.';
END $$;

