-- ============================================================
-- DODZ — Migration 009: Storage bucket for product images
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create a new public bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Set up RLS policies for the bucket
-- Allow public read access to product images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow managers to upload/update/delete images
CREATE POLICY "Manager Write Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-images' 
  AND public.is_manager()
);
