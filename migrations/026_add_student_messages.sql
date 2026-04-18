-- Add student_messages table for admin-to-student messaging
CREATE TABLE student_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE student_messages ENABLE ROW LEVEL SECURITY;

-- Students can view their own messages
CREATE POLICY "Students can view own messages"
ON student_messages FOR SELECT USING (
  auth.uid() = student_id
);

-- Students can update their own messages (to mark as read)
CREATE POLICY "Students can update own messages"
ON student_messages FOR UPDATE USING (
  auth.uid() = student_id
);

-- Admins can view all messages (checked via is_admin flag)
CREATE POLICY "Admins can view all messages"
ON student_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins can insert messages
CREATE POLICY "Admins can insert messages"
ON student_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON student_messages FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
