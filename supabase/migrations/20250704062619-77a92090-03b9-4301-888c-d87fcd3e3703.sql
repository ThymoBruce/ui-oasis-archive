-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Make robenthymo@gmail.com an admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'robenthymo@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create automated scraping schedule (runs at 12am and 12pm daily)
SELECT cron.schedule(
  'auto-scrape-designs-midnight',
  '0 0 * * *', -- Daily at midnight
  $$
  SELECT
    net.http_post(
        url:='https://lrhrkwdghhxducjdqbpi.supabase.co/functions/v1/auto-scrape-designs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyaHJrd2RnaGh4ZHVjamRxYnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MzQ3ODAsImV4cCI6MjA2NzExMDc4MH0.u4Olf99G_A3vannKuIa8iWnwiIZgRz7TqbvSf2DgeuQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'auto-scrape-designs-noon',
  '0 12 * * *', -- Daily at noon
  $$
  SELECT
    net.http_post(
        url:='https://lrhrkwdghhxducjdqbpi.supabase.co/functions/v1/auto-scrape-designs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyaHJrd2RnaGh4ZHVjamRxYnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MzQ3ODAsImV4cCI6MjA2NzExMDc4MH0.u4Olf99G_A3vannKuIa8iWnwiIZgRz7TqbvSf2DgeuQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create initial scraping trigger (runs once if no content exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM content LIMIT 1) THEN
    PERFORM net.http_post(
        url:='https://lrhrkwdghhxducjdqbpi.supabase.co/functions/v1/auto-scrape-designs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyaHJrd2RnaGh4ZHVjamRxYnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MzQ3ODAsImV4cCI6MjA2NzExMDc4MH0.u4Olf99G_A3vannKuIa8iWnwiIZgRz7TqbvSf2DgeuQ"}'::jsonb,
        body:='{"initial": true}'::jsonb
    );
  END IF;
END $$;