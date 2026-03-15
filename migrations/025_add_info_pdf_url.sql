-- Add info_pdf_url column for attaching PDFs to information collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS info_pdf_url TEXT;
