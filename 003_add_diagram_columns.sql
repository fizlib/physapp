-- Add diagram support to questions table (SVG only)
-- Run this migration to add diagram columns

ALTER TABLE questions 
ADD COLUMN diagram_type TEXT CHECK (diagram_type IN ('graph', 'scheme')),
ADD COLUMN diagram_svg TEXT;

-- Note: diagram_latex column is not needed since all diagrams are rendered as SVG
