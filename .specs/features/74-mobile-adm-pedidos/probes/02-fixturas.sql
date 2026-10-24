-- Feature 74 · T10 — fixturas do probe 02 (COMMITADAS: o PostgREST não vê transação aberta).
-- Toda linha leva o prefixo de id `00000000-0000-4000-c074-` e `order_number` explícito (nenhum
-- `nextval`). `02-limpa.sql` apaga tudo, e o `trap` do `02-lista.sh` o roda também em falha.
\set ON_ERROR_STOP on
insert into public.orders (id, order_number, customer_name, customer_email, payment_method, subtotal, total,
                           status, payment_status, material_status, tracking_code, created_at) values
  -- bloco "Pago, a separar" (zero no banco local antes desta fixtura).
  ('00000000-0000-4000-c074-00000000000a', 'PRB74-A', 'Probe74 Separar', 'p74a@exemplo.invalid', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', null, '2030-01-01T10:00:00Z'),
  -- R2 (preservada da 73): Pix pendente com status <> pending — conta no bloco "Pix aguardando".
  ('00000000-0000-4000-c074-00000000000b', 'PRB74-B', 'Probe74 Pix', 'p74b@exemplo.invalid', 'pix', 100, 100, 'cancelled', 'pending', 'nao_aplicavel', null, '2030-01-01T10:01:00Z'),
  -- A busca por #0244 / 0244 / 244.
  ('00000000-0000-4000-c074-00000000000c', '0244', 'Probe74 Busca', 'p74c@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', 'BR74C', '2030-01-01T10:02:00Z'),
  ('00000000-0000-4000-c074-00000000000d', '7244', 'Probe74 Sete', 'p74d@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', 'BR74D', '2030-01-01T10:03:00Z'),
  -- R1: dois pedidos no MESMO instante (µs), um a 1 µs, e um no mesmo milissegundo truncado.
  ('00000000-0000-4000-c074-0000000000e1', 'PRB74-E1', 'Probe74 Mesmo Segundo', 'p74e@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', 'BR74E1', '2030-01-02T10:00:00.123456Z'),
  ('00000000-0000-4000-c074-0000000000e2', 'PRB74-E2', 'Probe74 Mesmo Segundo', 'p74e@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', 'BR74E2', '2030-01-02T10:00:00.123456Z'),
  ('00000000-0000-4000-c074-0000000000e3', 'PRB74-E3', 'Probe74 Mesmo Segundo', 'p74e@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', 'BR74E3', '2030-01-02T10:00:00.123457Z'),
  ('00000000-0000-4000-c074-0000000000e4', 'PRB74-E4', 'Probe74 Mesmo Segundo', 'p74e@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', 'BR74E4', '2030-01-02T10:00:00.123Z'),
  -- bloco "Enviado sem rastreio" e bloco "Aguardando material".
  ('00000000-0000-4000-c074-00000000000f', 'PRB74-F', 'Probe74 Sem Rastreio', 'p74f@exemplo.invalid', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '2030-01-01T10:04:00Z'),
  ('00000000-0000-4000-c074-000000000001', 'PRB74-G', 'Probe74 Aguardando', 'p74g@exemplo.invalid', 'pix', 100, 100, 'paid', 'approved', 'aguardando_material', null, '2030-01-01T10:05:00Z'),
  -- enchimento: "Tudo" passa de 60 linhas (54 do banco local + 13).
  ('00000000-0000-4000-c074-000000000011', 'PRB74-P1', 'Probe74 Enche', 'p74p@exemplo.invalid', 'cartao', 50, 50, 'delivered', 'approved', 'nao_aplicavel', 'BR74P1', '2029-06-01T10:00:00Z'),
  ('00000000-0000-4000-c074-000000000012', 'PRB74-P2', 'Probe74 Enche', 'p74p@exemplo.invalid', 'cartao', 50, 50, 'delivered', 'approved', 'nao_aplicavel', 'BR74P2', '2029-06-02T10:00:00Z'),
  ('00000000-0000-4000-c074-000000000013', 'PRB74-P3', 'Probe74 Enche', 'p74p@exemplo.invalid', 'cartao', 50, 50, 'delivered', 'approved', 'nao_aplicavel', 'BR74P3', '2029-06-03T10:00:00Z');

-- Uma linha em cada relação do detalhe (do pedido C), para conferir as chaves da resposta.
insert into public.order_items (id, order_id, product_id, product_name, variant_label, engraving_text, quantity, unit_price)
values ('00000000-0000-4000-c074-0000000000c1', '00000000-0000-4000-c074-00000000000c', 'probe74', 'Probe74 Joia', 'Prata', 'Ana', 1, 100);
insert into public.order_status_history (id, order_id, from_status, to_status, note)
values ('00000000-0000-4000-c074-0000000000c2', '00000000-0000-4000-c074-00000000000c', 'shipped', 'delivered', null);
insert into public.order_notes (id, order_id, note)
values ('00000000-0000-4000-c074-0000000000c3', '00000000-0000-4000-c074-00000000000c', 'Probe74 nota');
insert into public.order_notifications (id, order_id, event, status)
values ('00000000-0000-4000-c074-0000000000c4', '00000000-0000-4000-c074-00000000000c', 'order_delivered', 'sent');
