-- Add tab monitoring to collections
ALTER TABLE collections ADD COLUMN tab_monitoring_enabled BOOLEAN DEFAULT false;

-- Table to track tab switch violations per student per collection
CREATE TABLE tab_monitoring_violations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked BOOLEAN DEFAULT true,
    violated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    unblocked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(collection_id, student_id)
);

ALTER TABLE tab_monitoring_violations ENABLE ROW LEVEL SECURITY;

-- Students can view their own violations
CREATE POLICY "Students can view own tab violations"
ON tab_monitoring_violations FOR SELECT USING (
    auth.uid() = student_id
);

-- Students can insert their own violations (when they switch tabs)
CREATE POLICY "Students can insert own tab violations"
ON tab_monitoring_violations FOR INSERT WITH CHECK (
    auth.uid() = student_id
);

-- Teachers can view violations for their classrooms
CREATE POLICY "Teachers can view tab violations"
ON tab_monitoring_violations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM collections
        JOIN classrooms ON collections.classroom_id = classrooms.id
        WHERE collections.id = tab_monitoring_violations.collection_id
        AND classrooms.teacher_id = auth.uid()
    )
);

-- Teachers can update violations (unblock students)
CREATE POLICY "Teachers can update tab violations"
ON tab_monitoring_violations FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM collections
        JOIN classrooms ON collections.classroom_id = classrooms.id
        WHERE collections.id = tab_monitoring_violations.collection_id
        AND classrooms.teacher_id = auth.uid()
    )
);
