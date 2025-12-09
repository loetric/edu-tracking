-- ============================================
-- FIX FILES TABLE RLS POLICY FOR INSERT (V2)
-- ============================================
-- This script fixes the RLS policy for inserting files
-- Uses the same pattern as schedule policies which work correctly

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can insert files" ON public.files;
DROP POLICY IF EXISTS "Admin can update files" ON public.files;
DROP POLICY IF EXISTS "Admin can delete files" ON public.files;

-- Create INSERT policy using the same pattern as schedule policies
CREATE POLICY "Admin can insert files" ON public.files
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Create UPDATE policy
CREATE POLICY "Admin can update files" ON public.files
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Create DELETE policy
CREATE POLICY "Admin can delete files" ON public.files
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Files table RLS policies fixed successfully (V2)!';
    RAISE NOTICE 'The policies now use the same pattern as schedule policies.';
END $$;

