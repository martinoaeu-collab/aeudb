
-- Add access_code to profiles for PIN-based login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Create user_category_access junction table
CREATE TABLE IF NOT EXISTS public.user_category_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, category_id)
);

-- Enable RLS on user_category_access
ALTER TABLE public.user_category_access ENABLE ROW LEVEL SECURITY;

-- Users can see their own category access
CREATE POLICY "Users can view their own category access"
ON public.user_category_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all category access
CREATE POLICY "Admins can manage category access"
ON public.user_category_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert category access
CREATE POLICY "Admins can insert category access"
ON public.user_category_access
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
