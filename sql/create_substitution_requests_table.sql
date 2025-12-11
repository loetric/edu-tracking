-- ============================================
-- CREATE SUBSTITUTION REQUESTS TABLE
-- ============================================
-- This script creates the substitution_requests table for managing substitution approval workflow

-- Create substitution_requests table
CREATE TABLE IF NOT EXISTS public.substitution_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date text NOT NULL,
    schedule_item_id text NOT NULL,
    substitute_teacher text NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    rejection_reason text,
    requested_at timestamptz DEFAULT now() NOT NULL,
    responded_at timestamptz,
    requested_by text
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_substitution_requests_status ON public.substitution_requests(status);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_teacher ON public.substitution_requests(substitute_teacher);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_date ON public.substitution_requests(date);

-- Add RLS policies for substitution_requests
DROP POLICY IF EXISTS "Authenticated can select substitution requests" ON public.substitution_requests;
DROP POLICY IF EXISTS "Authenticated can insert substitution requests" ON public.substitution_requests;
DROP POLICY IF EXISTS "Authenticated can update substitution requests" ON public.substitution_requests;
DROP POLICY IF EXISTS "Authenticated can delete substitution requests" ON public.substitution_requests;

-- Authenticated users can select substitution requests
CREATE POLICY "Authenticated can select substitution requests" ON public.substitution_requests
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can insert substitution requests
CREATE POLICY "Authenticated can insert substitution requests" ON public.substitution_requests
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update substitution requests
CREATE POLICY "Authenticated can update substitution requests" ON public.substitution_requests
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete substitution requests
CREATE POLICY "Authenticated can delete substitution requests" ON public.substitution_requests
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Substitution requests table created successfully!';
END $$;

