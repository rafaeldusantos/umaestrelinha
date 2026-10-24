-- Feature 76 · T30 — a conta SEM papel admin, com um pedido PRÓPRIO como cliente (Success Criterion 3).
-- Ao nascer, ela adota o pedido P76-CLI pelo e-mail (`handle_new_customer`). Ids …-a076-….
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method,
  subtotal, total, status, payment_status, material_status, shipping_service_id, address_city, address_state, created_at)
values ('00000000-0000-4000-c076-0000000990c0', 'P76-CLI', 'P76 Sem Papel', 'probe76-cliente@exemplo.invalid', '51999990000',
  'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', '1', 'Gramado', 'RS', '2030-03-01T10:00:00Z');
insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price)
values ('00000000-0000-4000-c076-0000000990c1', '00000000-0000-4000-c076-0000000990c0', 'probe76', 'P76 Joia', 1, 100);
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a076-000000000001', 'authenticated', 'authenticated',
  'probe76-cliente@exemplo.invalid', extensions.crypt('probe76senha', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
values ('email', '00000000-0000-4000-a076-000000000001', '00000000-0000-4000-a076-000000000001',
  jsonb_build_object('sub', '00000000-0000-4000-a076-000000000001', 'email', 'probe76-cliente@exemplo.invalid', 'email_verified', true), now(), now(), now());
