-- ============================================
-- ADD FILES TABLE FOR FILE SHARING
-- ============================================
-- This script creates a table for file sharing functionality

CREATE TABLE IF NOT EXISTS public.files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_type text NOT NULL, -- 'general', 'circular', 'decision'
    file_category text NOT NULL, -- 'excel', 'word', 'pdf', 'image', 'other'
    file_size bigint, -- Size in bytes
    access_level text NOT NULL CHECK (access_level IN ('public', 'teachers', 'counselors', 'teachers_counselors')),
    uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_files_file_type ON public.files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_access_level ON public.files(access_level);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);

-- RLS Policies
-- All authenticated users can read files based on access level
CREATE POLICY "Select files based on access level" ON public.files
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            access_level = 'public' OR
            (access_level = 'teachers' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'teacher'
            )) OR
            (access_level = 'counselors' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'counselor'
            )) OR
            (access_level = 'teachers_counselors' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('teacher', 'counselor')
            ))
        )
    );

-- Only admins can insert files
CREATE POLICY "Admin can insert files" ON public.files
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update files
CREATE POLICY "Admin can update files" ON public.files
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete files
CREATE POLICY "Admin can delete files" ON public.files
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Files table and RLS policies created successfully!';
END $$;

