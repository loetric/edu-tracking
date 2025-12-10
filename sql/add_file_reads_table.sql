-- Create file_reads table to track who read which file
CREATE TABLE IF NOT EXISTS public.file_reads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(file_id, user_id) -- Prevent duplicate reads
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_reads_file_id ON public.file_reads(file_id);
CREATE INDEX IF NOT EXISTS idx_file_reads_user_id ON public.file_reads(user_id);

-- RLS Policies for file_reads
ALTER TABLE public.file_reads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own reads
CREATE POLICY "Users can mark files as read"
ON public.file_reads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to see who read files (for files they have access to)
CREATE POLICY "Users can view file reads"
ON public.file_reads
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.id = file_reads.file_id
        AND (
            f.access_level = 'public'
            OR (f.access_level = 'teachers' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')))
            OR (f.access_level = 'counselors' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('counselor', 'admin')))
            OR (f.access_level = 'teachers_counselors' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'counselor', 'admin')))
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
);

-- Allow admins to delete reads
CREATE POLICY "Admins can delete file reads"
ON public.file_reads
FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

