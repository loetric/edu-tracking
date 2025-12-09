-- ============================================
-- FIX FILES TABLE RLS POLICY FOR INSERT
-- ============================================
-- This script fixes the RLS policy for inserting files
-- The issue is that the policy needs to properly check if the user is an admin

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin can insert files" ON public.files;

-- Create a more robust INSERT policy
-- This uses the same pattern as other admin policies in the system
CREATE POLICY "Admin can insert files" ON public.files
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Also ensure UPDATE and DELETE policies are correct
DROP POLICY IF EXISTS "Admin can update files" ON public.files;
CREATE POLICY "Admin can update files" ON public.files
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin can delete files" ON public.files;
CREATE POLICY "Admin can delete files" ON public.files
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Files table RLS policies fixed successfully!';
END $$;

