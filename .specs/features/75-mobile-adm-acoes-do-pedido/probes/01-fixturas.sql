-- Feature 75 · T29 — fixturas do probe de paridade (P75-…). Cada caso nasce DUAS vezes:
-- a (app, runAppAction) e p (painel, writeX como o hook chama), com as mesmas colunas.
-- O caso 11 é um pedido da loja que a conta SEM papel tenta mudar; o 'cli' é o pedido DELA.
-- Ids: 00000000-0000-4000-c075-0000000<caso><a|p>…; usuário sem papel: …-a075-….
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method, subtotal, total, status, payment_status, material_status, tracking_code, shipping_service_id, created_at) values
  ('00000000-0000-4000-c075-0000000010a0', 'P75-01A', 'Probe75 Cliente 01', 'probe75-01a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'aguardando_material', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000010b0', 'P75-01P', 'Probe75 Cliente 01', 'probe75-01p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'aguardando_material', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000020a0', 'P75-02A', 'Probe75 Cliente 02', 'probe75-02a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000020b0', 'P75-02P', 'Probe75 Cliente 02', 'probe75-02p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000030a0', 'P75-03A', 'Probe75 Cliente 03', 'probe75-03a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'material_recebido', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000030b0', 'P75-03P', 'Probe75 Cliente 03', 'probe75-03p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'material_recebido', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000040a0', 'P75-04A', 'Probe75 Cliente 04', 'probe75-04a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'separating', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000040b0', 'P75-04P', 'Probe75 Cliente 04', 'probe75-04p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'separating', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000050a0', 'P75-05A', 'Probe75 Cliente 05', 'probe75-05a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000050b0', 'P75-05P', 'Probe75 Cliente 05', 'probe75-05p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000060a0', 'P75-06A', 'Probe75 Cliente 06', 'probe75-06a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000060b0', 'P75-06P', 'Probe75 Cliente 06', 'probe75-06p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000070a0', 'P75-07A', 'Probe75 Cliente 07', 'probe75-07a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000070b0', 'P75-07P', 'Probe75 Cliente 07', 'probe75-07p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000080a0', 'P75-08A', 'Probe75 Cliente 08', 'probe75-08a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'separating', 'approved', 'nao_aplicavel', null, 'retirada', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000080b0', 'P75-08P', 'Probe75 Cliente 08', 'probe75-08p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'separating', 'approved', 'nao_aplicavel', null, 'retirada', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000090a0', 'P75-09A', 'Probe75 Cliente 09', 'probe75-09a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'separating', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000090b0', 'P75-09P', 'Probe75 Cliente 09', 'probe75-09p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'separating', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000100a0', 'P75-10A', 'Probe75 Cliente 10', 'probe75-10a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000100b0', 'P75-10P', 'Probe75 Cliente 10', 'probe75-10p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000110a0', 'P75-11A', 'Probe75 Cliente 11', 'probe75-11a@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000110b0', 'P75-11P', 'Probe75 Cliente 11', 'probe75-11p@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z'),
  ('00000000-0000-4000-c075-0000000990c0', 'P75-CLI', 'Probe75 Sem Papel', 'probe75-cliente@exemplo.invalid', '51999990000', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', null, '1', '2030-03-01T10:00:00Z');
insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price) values
  ('00000000-0000-4000-c075-0000000010a1', '00000000-0000-4000-c075-0000000010a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000010b1', '00000000-0000-4000-c075-0000000010b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000020a1', '00000000-0000-4000-c075-0000000020a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000020b1', '00000000-0000-4000-c075-0000000020b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000030a1', '00000000-0000-4000-c075-0000000030a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000030b1', '00000000-0000-4000-c075-0000000030b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000040a1', '00000000-0000-4000-c075-0000000040a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000040b1', '00000000-0000-4000-c075-0000000040b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000050a1', '00000000-0000-4000-c075-0000000050a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000050b1', '00000000-0000-4000-c075-0000000050b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000060a1', '00000000-0000-4000-c075-0000000060a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000060b1', '00000000-0000-4000-c075-0000000060b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000070a1', '00000000-0000-4000-c075-0000000070a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000070b1', '00000000-0000-4000-c075-0000000070b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000080a1', '00000000-0000-4000-c075-0000000080a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000080b1', '00000000-0000-4000-c075-0000000080b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000090a1', '00000000-0000-4000-c075-0000000090a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000090b1', '00000000-0000-4000-c075-0000000090b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000100a1', '00000000-0000-4000-c075-0000000100a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000100b1', '00000000-0000-4000-c075-0000000100b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000110a1', '00000000-0000-4000-c075-0000000110a0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000110b1', '00000000-0000-4000-c075-0000000110b0', 'probe75', 'Probe75 Joia', 1, 100),
  ('00000000-0000-4000-c075-0000000990c1', '00000000-0000-4000-c075-0000000990c0', 'probe75', 'Probe75 Joia', 1, 100);
-- A conta SEM papel; ao nascer, adota o pedido P75-CLI pelo e-mail (`handle_new_customer`).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a075-000000000001', 'authenticated', 'authenticated',
  'probe75-cliente@exemplo.invalid', extensions.crypt('probe75senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '00000000-0000-4000-a075-000000000001', '00000000-0000-4000-a075-000000000001',
  jsonb_build_object('sub', '00000000-0000-4000-a075-000000000001', 'email', 'probe75-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
