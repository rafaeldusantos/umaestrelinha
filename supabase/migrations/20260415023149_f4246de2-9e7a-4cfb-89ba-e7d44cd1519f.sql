INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');
