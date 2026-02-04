-- Create ip_bypasses table for temporary IP access control override
CREATE TABLE IF NOT EXISTS ip_bypasses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, collection_id)
);

-- Enable RLS
ALTER TABLE ip_bypasses ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins can manage ip_bypasses"
ON ip_bypasses FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Users can view their own bypasses
CREATE POLICY "Users can view their own bypasses"
ON ip_bypasses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_ip_bypasses_user_collection ON ip_bypasses(user_id, collection_id);
CREATE INDEX idx_ip_bypasses_expires_at ON ip_bypasses(expires_at);
