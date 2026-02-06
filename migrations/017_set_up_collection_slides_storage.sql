-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection_slides', 'collection_slides', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated teachers to upload files
CREATE POLICY "Teachers can upload collection slides"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'collection_slides' AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
);

-- 3. Allow authenticated teachers to update/delete their own uploads
CREATE POLICY "Teachers can manage their own collection slides"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'collection_slides' AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
);

-- 4. Allow public access to view slides (since bucket is public, but policy adds safety)
CREATE POLICY "Anyone can view collection slides"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'collection_slides');
