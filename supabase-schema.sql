-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role TEXT CHECK (role IN ('teacher', 'student')) NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT, -- Added for display purposes
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- CLASSROOMS
CREATE TABLE classrooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('private_student', 'school_class')) DEFAULT 'school_class',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- Teachers can create classrooms
CREATE POLICY "Teachers can create classrooms"
ON classrooms FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher')
);

-- Teachers can view their own classrooms
CREATE POLICY "Teachers can view own classrooms"
ON classrooms FOR SELECT USING (
  auth.uid() = teacher_id
);

-- Teachers can delete their own classrooms
CREATE POLICY "Teachers can delete own classrooms"
ON classrooms FOR DELETE USING (
  auth.uid() = teacher_id
);

-- ENROLLMENTS (Added to support "enrolled in" RLS logic)
CREATE TABLE enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  classroom_id UUID REFERENCES classrooms(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, classroom_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their enrollments"
ON enrollments FOR SELECT USING (
  auth.uid() = student_id
);

CREATE POLICY "Students can join classrooms"
ON enrollments FOR INSERT WITH CHECK (
  auth.uid() = student_id
  auth.uid() = student_id
);

-- Helper function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_teacher_of_classroom(p_classroom_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM classrooms 
    WHERE id = p_classroom_id 
    AND teacher_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- Teachers can view enrollments for their classrooms
CREATE POLICY "Teachers can view enrollments"
ON enrollments FOR SELECT USING (
  public.is_teacher_of_classroom(classroom_id)
);

-- Teachers can delete enrollments
CREATE POLICY "Teachers can delete enrollments"
ON enrollments FOR DELETE USING (
  public.is_teacher_of_classroom(classroom_id)
);

-- Allow students to view classrooms they are enrolled in
CREATE POLICY "Students can view enrolled classrooms"
ON classrooms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.classroom_id = classrooms.id 
    AND enrollments.student_id = auth.uid()
  )
);

-- ASSIGNMENTS
CREATE TABLE assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id) NOT NULL,
  title TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  published BOOLEAN DEFAULT false,
  category TEXT CHECK (category IN ('homework', 'classwork')) DEFAULT 'homework',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can manage assignments for their classrooms
CREATE POLICY "Teachers can manage assignments"
ON assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = assignments.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);

-- Students can view published assignments they are enrolled in
CREATE POLICY "Students can view enrolled assignments"
ON assignments FOR SELECT USING (
  published = true AND
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.classroom_id = assignments.classroom_id
    AND enrollments.student_id = auth.uid()
  )
);

-- QUESTIONS
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) NOT NULL,
  latex_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  correct_value NUMERIC, -- SECURITY NOTE: Pure RLS cannot hide columns from SELECT *. Ideally, move to separate table or use Views.
  tolerance_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage questions
CREATE POLICY "Teachers can manage questions"
ON questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = questions.assignment_id
    AND classrooms.teacher_id = auth.uid()
  )
);

-- Students can view questions (BUT NOT correct_value... handled by API/Views usually, RLS here allows row access)
CREATE POLICY "Students can view questions for assignments"
ON questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN enrollments ON assignments.classroom_id = enrollments.classroom_id
    WHERE assignments.id = questions.assignment_id
    AND enrollments.student_id = auth.uid()
    AND assignments.published = true
  )
);

-- SUBMISSIONS
CREATE TABLE submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  assignment_id UUID REFERENCES assignments(id) NOT NULL,
  score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Students can create submissions
CREATE POLICY "Students can create submissions"
ON submissions FOR INSERT WITH CHECK (
  auth.uid() = student_id
);

-- Students can view own submissions
CREATE POLICY "Students can view own submissions"
ON submissions FOR SELECT USING (
  auth.uid() = student_id
);

-- Teachers can view submissions for their assignments
    AND classrooms.teacher_id = auth.uid()
  )
);

-- Teachers can delete submissions for their assignments
CREATE POLICY "Teachers can delete submissions"
ON submissions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = submissions.assignment_id
    AND classrooms.teacher_id = auth.uid()
  )
);
