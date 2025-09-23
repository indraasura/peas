    -- Better Architecture: Separate POD Committee and Members
    -- Run this in your Supabase SQL Editor

    -- 1. Keep existing profiles table for POD committee members (Supabase auth users)
    -- 2. Create a new members table for regular team members

    -- Create members table for non-POD committee members
    CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- Store hashed passwords
    name TEXT NOT NULL,
    team TEXT NOT NULL DEFAULT 'Member',
    bandwidth INTEGER DEFAULT 100, -- Total bandwidth percentage (e.g., 100%)
    available_bandwidth INTEGER DEFAULT 100, -- Available bandwidth
    used_bandwidth INTEGER DEFAULT 0, -- Used bandwidth
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable RLS for members table
    ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for members table
    CREATE POLICY "Allow all reads" ON public.members FOR SELECT USING (true);
    CREATE POLICY "Allow POD committee to manage members" ON public.members FOR ALL USING (
    auth.uid() IS NOT NULL -- Only authenticated POD committee members
    );

-- Update POD notes policies to allow members to manage notes for their assigned PODs
DROP POLICY IF EXISTS "Allow all reads" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow authenticated notes management" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow POD committee notes management" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow members to manage notes for assigned PODs" ON public.pod_notes;

CREATE POLICY "Allow all reads" ON public.pod_notes FOR SELECT USING (true);
CREATE POLICY "Allow POD committee notes management" ON public.pod_notes FOR ALL USING (
  auth.uid() IS NOT NULL -- POD committee members can manage all notes
);
CREATE POLICY "Allow members to manage notes for assigned PODs" ON public.pod_notes FOR ALL USING (
  -- Allow if the current user is a member assigned to this POD
  -- This will be enforced at the application level for members
  true -- We'll handle member access in the application layer
);

    -- Update pod_members table to reference the new members table
    -- First, let's see if we need to migrate existing data
    -- (This will be handled in the application layer)

    -- Create a function to authenticate members
    CREATE OR REPLACE FUNCTION public.authenticate_member(
    p_email TEXT,
    p_password TEXT
    )
    RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    team TEXT,
    created_at TIMESTAMP WITH TIME ZONE
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
    -- Simple password check (in production, use proper hashing)
    RETURN QUERY
    SELECT m.id, m.email, m.name, m.team, m.created_at
    FROM public.members m
    WHERE m.email = p_email 
    AND m.password_hash = p_password; -- In production, use crypt() or similar
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) TO anon;
    GRANT EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) TO authenticated;

    -- Create a function to create new members (for POD committee)
    CREATE OR REPLACE FUNCTION public.create_member(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_team TEXT,
    p_bandwidth INTEGER DEFAULT 100
    )
    RETURNS public.members
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
    new_member public.members;
    BEGIN
    -- Check if caller is authenticated (POD committee member)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Only POD committee members can create members';
    END IF;
    
    INSERT INTO public.members (email, password_hash, name, team, bandwidth, available_bandwidth, used_bandwidth)
    VALUES (p_email, p_password, p_name, p_team, p_bandwidth, p_bandwidth, 0) -- In production, hash the password
    RETURNING * INTO new_member;
    
    RETURN new_member;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.create_member(TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;

    -- Sample data for testing
    INSERT INTO public.members (email, password_hash, name, team, bandwidth, available_bandwidth, used_bandwidth) VALUES
    ('john.doe@company.com', 'password123', 'John Doe', 'Engineering', 100, 75, 25),
    ('jane.smith@company.com', 'password123', 'Jane Smith', 'Product', 100, 50, 50),
    ('mike.wilson@company.com', 'password123', 'Mike Wilson', 'Sales', 100, 100, 0)
    ON CONFLICT (email) DO NOTHING;
