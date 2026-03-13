-- Add theory_content column to collections table for markdown theory text
ALTER TABLE public.collections ADD COLUMN theory_content TEXT;
