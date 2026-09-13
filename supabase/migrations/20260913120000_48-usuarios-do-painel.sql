-- Feature 48 — usuarios do painel (USR-16)
--
-- ---------------------------------------------------------------------
-- A UNICA invariante desta feature que nao pode viver em TypeScript.
-- ---------------------------------------------------------------------
--
-- A edge function `admin-users` recusa remover o ultimo admin, e recusa com motivo legivel — mas
-- ela e uma porta, e porta se contorna: requisicao forjada com a service role, `psql`, o Studio, ou
-- simplesmente duas remocoes ao mesmo tempo. Se `public.user_roles` ficar sem nenhuma linha com
-- `role = 'admin'`, NINGUEM entra no painel e nao ha tela para consertar — `has_role` passa a
-- devolver false para todo mundo, e toda policy de admin do schema fecha junto.
--
-- Este trigger e o suspensorio; a function e o cinto. Mesma divisao de `materialTransitions`: so o
-- banco impede o forjado, so o TypeScript produz motivo legivel.
--
-- ---------------------------------------------------------------------
-- DECIDE POR CONTAGEM, NUNCA POR IDENTIDADE
-- ---------------------------------------------------------------------
--
-- Mesma regua de `guard_last_active_home_section` (AD-029), e pela mesma razao: um guarda que
-- protegesse "a linha da Adri" envelhece no dia em que a conta dela mudar, e barra a operacao
-- legitima de trocar quem administra a loja. O que precisa ser verdade nao e "a Adri e admin", e sim
-- "existe pelo menos um admin".
--
-- ---------------------------------------------------------------------
-- POR QUE O ADVISORY LOCK, e nao a limitacao declarada da 41
-- ---------------------------------------------------------------------
--
-- `guard_last_active_home_section` declara e aceita que duas transacoes simultaneas podem passar as
-- duas, porque cada uma conta antes de a outra confirmar. Aqui esse desfecho e pior: la ele produz
-- uma Home em branco, que se conserta pelo painel; aqui ele produz um painel sem ninguem, que nao se
-- conserta por tela nenhuma.
--
-- `pg_advisory_xact_lock` serializa TODA mutacao de papel numa fila so, e solta sozinho no fim da
-- transacao. A alternativa obvia — `for update` sobre as linhas restantes — cria deadlock quando
-- duas transacoes apagam admins diferentes (cada uma espera a linha que a outra apagou): o Postgres
-- resolve abortando uma, mas com erro de deadlock no lugar da mensagem desta funcao. A chave e
-- derivada do nome da tabela, entao e estavel entre deploys e nao colide por acidente com outro uso.
--
-- A tabela tem um punhado de linhas e a loja tem uma administradora: o custo do lock e zero.

create or replace function public.guard_last_admin()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	restantes integer;
begin
	-- Dois caminhos podem esvaziar o painel: APAGAR uma linha de admin, ou trocar o papel dela para
	-- outra coisa. Todo o resto passa direto — inclusive apagar linha de `moderator`/`user`, e
	-- CONCEDER admin a mais alguem, que e a operacao que esta feature existe para permitir.
	if tg_op = 'DELETE' then
		if old.role <> 'admin' then
			return old;
		end if;
	elsif not (old.role = 'admin' and new.role <> 'admin') then
		return new;
	end if;

	perform pg_advisory_xact_lock(hashtext('public.user_roles:last_admin')::bigint);

	-- UMA contagem e UMA recusa para os dois caminhos. Duas copias divergiriam na primeira vez que
	-- alguem ajustasse a frase de um lado so.
	select count(*) into restantes
		from public.user_roles
		where role = 'admin' and id <> old.id;

	if restantes = 0 then
		-- errcode 23514 (check_violation) para o PostgREST reportar como violacao de constraint, e
		-- nao como erro generico de plpgsql. E esta mensagem que chega a tela quando a escrita nao
		-- veio pela function; ela tem um dono so, e ninguem a reescreve.
		raise exception 'O painel precisa de pelo menos um acesso de admin, e este e o ultimo.'
			using errcode = '23514';
	end if;

	if tg_op = 'DELETE' then
		return old;
	end if;

	return new;
end;
$$;

comment on function public.guard_last_admin() is
	'USR-16: torna impossivel public.user_roles ficar sem nenhum admin. Decide por CONTAGEM dos admins restantes, nunca pela identidade da linha — o que precisa ser verdade e "existe pelo menos um admin", nao "a Adri e admin". Serializa por pg_advisory_xact_lock para que duas remocoes simultaneas nao passem as duas; a alternativa (for update) daria deadlock quando cada transacao apaga um admin diferente.';

drop trigger if exists trg_user_roles_last_admin_guard on public.user_roles;
create trigger trg_user_roles_last_admin_guard
	before update or delete on public.user_roles
	for each row execute function public.guard_last_admin();
