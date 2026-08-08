-- =====================================================================
-- Converge o schema legado de coupons para o formato esperado pelo app
-- e registra o cupom aplicado em orders.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	code text NOT NULL UNIQUE,
	description text,
	type text NOT NULL,
	value numeric(10,2) NOT NULL DEFAULT 0,
	min_order numeric(10,2) NOT NULL DEFAULT 0,
	max_uses integer,
	used_count integer NOT NULL DEFAULT 0,
	first_order_only boolean NOT NULL DEFAULT false,
	active boolean NOT NULL DEFAULT true,
	valid_from timestamptz,
	valid_until timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'coupons'
			AND column_name = 'discount_type'
	) THEN
		IF EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = 'coupons'
				AND column_name = 'type'
		) THEN
			EXECUTE '
				UPDATE public.coupons
				SET type = COALESCE(type, discount_type)
				WHERE type IS NULL
			';
			EXECUTE 'ALTER TABLE public.coupons DROP COLUMN discount_type';
		ELSE
			EXECUTE 'ALTER TABLE public.coupons RENAME COLUMN discount_type TO type';
		END IF;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'coupons'
			AND column_name = 'discount_value'
	) THEN
		IF EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = 'coupons'
				AND column_name = 'value'
		) THEN
			EXECUTE '
				UPDATE public.coupons
				SET value = COALESCE(value, discount_value)
				WHERE value IS NULL
			';
			EXECUTE 'ALTER TABLE public.coupons DROP COLUMN discount_value';
		ELSE
			EXECUTE 'ALTER TABLE public.coupons RENAME COLUMN discount_value TO value';
		END IF;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'coupons'
			AND column_name = 'uses'
	) THEN
		IF EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = 'coupons'
				AND column_name = 'used_count'
		) THEN
			EXECUTE '
				UPDATE public.coupons
				SET used_count = COALESCE(used_count, uses)
				WHERE used_count IS NULL
			';
			EXECUTE 'ALTER TABLE public.coupons DROP COLUMN uses';
		ELSE
			EXECUTE 'ALTER TABLE public.coupons RENAME COLUMN uses TO used_count';
		END IF;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'coupons'
			AND column_name = 'expires_at'
	) THEN
		IF EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = 'coupons'
				AND column_name = 'valid_until'
		) THEN
			EXECUTE '
				UPDATE public.coupons
				SET valid_until = COALESCE(valid_until, expires_at)
				WHERE valid_until IS NULL
			';
			EXECUTE 'ALTER TABLE public.coupons DROP COLUMN expires_at';
		ELSE
			EXECUTE 'ALTER TABLE public.coupons RENAME COLUMN expires_at TO valid_until';
		END IF;
	END IF;
END $$;

ALTER TABLE public.coupons
	ADD COLUMN IF NOT EXISTS description text,
	ADD COLUMN IF NOT EXISTS type text,
	ADD COLUMN IF NOT EXISTS value numeric(10,2),
	ADD COLUMN IF NOT EXISTS used_count integer,
	ADD COLUMN IF NOT EXISTS first_order_only boolean,
	ADD COLUMN IF NOT EXISTS valid_from timestamptz,
	ADD COLUMN IF NOT EXISTS valid_until timestamptz,
	ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.coupons
SET
	type = COALESCE(type, 'percent'),
	value = COALESCE(value, 0),
	min_order = COALESCE(min_order, 0),
	used_count = COALESCE(used_count, 0),
	first_order_only = COALESCE(first_order_only, false),
	active = COALESCE(active, true),
	created_at = COALESCE(created_at, now()),
	updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE public.coupons
	ALTER COLUMN code SET NOT NULL,
	ALTER COLUMN type TYPE text,
	ALTER COLUMN type SET DEFAULT 'percent',
	ALTER COLUMN type SET NOT NULL,
	ALTER COLUMN value TYPE numeric(10,2) USING value::numeric(10,2),
	ALTER COLUMN value SET DEFAULT 0,
	ALTER COLUMN value SET NOT NULL,
	ALTER COLUMN min_order TYPE numeric(10,2) USING min_order::numeric(10,2),
	ALTER COLUMN min_order SET DEFAULT 0,
	ALTER COLUMN min_order SET NOT NULL,
	ALTER COLUMN used_count SET DEFAULT 0,
	ALTER COLUMN used_count SET NOT NULL,
	ALTER COLUMN first_order_only SET DEFAULT false,
	ALTER COLUMN first_order_only SET NOT NULL,
	ALTER COLUMN active SET DEFAULT true,
	ALTER COLUMN active SET NOT NULL,
	ALTER COLUMN created_at SET DEFAULT now(),
	ALTER COLUMN created_at SET NOT NULL,
	ALTER COLUMN updated_at SET DEFAULT now(),
	ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
ALTER TABLE public.coupons
	ADD CONSTRAINT coupons_type_check
	CHECK (type IN ('percent', 'fixed', 'free_shipping'));

CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (lower(code));
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (active) WHERE active = true;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin full coupons" ON public.coupons;
DROP POLICY IF EXISTS "coupons_public_read" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_write" ON public.coupons;
DROP POLICY IF EXISTS "coupons_auth_write" ON public.coupons;

CREATE POLICY "coupons_public_read"
	ON public.coupons
	FOR SELECT
	USING (true);

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'has_role'
	) THEN
		EXECUTE $policy$
			CREATE POLICY "coupons_admin_write"
				ON public.coupons
				FOR ALL
				TO authenticated
				USING (public.has_role(auth.uid(), 'admin'))
				WITH CHECK (public.has_role(auth.uid(), 'admin'));
		$policy$;
	ELSE
		EXECUTE $policy$
			CREATE POLICY "coupons_auth_write"
				ON public.coupons
				FOR ALL
				TO authenticated
				USING (true)
				WITH CHECK (true);
		$policy$;
	END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_coupons_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at
	BEFORE UPDATE ON public.coupons
	FOR EACH ROW
	EXECUTE FUNCTION public.touch_coupons_updated_at();

ALTER TABLE public.orders
	ADD COLUMN IF NOT EXISTS coupon_code text,
	ADD COLUMN IF NOT EXISTS coupon_id uuid;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'orders_coupon_id_fkey'
			AND conrelid = 'public.orders'::regclass
	) THEN
		ALTER TABLE public.orders
			ADD CONSTRAINT orders_coupon_id_fkey
			FOREIGN KEY (coupon_id)
			REFERENCES public.coupons(id)
			ON DELETE SET NULL;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON public.orders(coupon_id);

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	UPDATE public.coupons
	SET used_count = used_count + 1
	WHERE id = coupon_id_param
		AND active = true
		AND (max_uses IS NULL OR used_count < max_uses);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO authenticated;