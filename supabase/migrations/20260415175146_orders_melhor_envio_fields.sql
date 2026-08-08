ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS melhor_envio_id text,
  ADD COLUMN IF NOT EXISTS melhor_envio_label_url text,
  ADD COLUMN IF NOT EXISTS melhor_envio_protocol text;;
