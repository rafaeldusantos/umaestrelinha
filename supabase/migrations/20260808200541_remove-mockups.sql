-- =====================================================================
-- Remove o domínio de mockup de botton (feature 20 · PIN-01, PIN-02).
--
-- O Mockup Studio compunha foto de botton — fundo, art-zone, relevo do domo,
-- overlay. Nada disso tem leitura no domínio de joia afetiva, e o código que
-- lia esta tabela saiu nos commits anteriores desta fase.
--
-- Idempotente por construção: tudo é `if exists`, então roda em banco que
-- nunca teve a tabela (o caso do `db reset` daqui em diante) e em banco que a
-- tinha. Rodar duas vezes completa sem erro.
--
-- Ordem importa: os objetos do bucket saem ANTES do bucket, porque
-- `storage.objects.bucket_id` referencia `storage.buckets.id`. Apagar só o
-- bucket deixaria a linha órfã — ou falharia na FK, dependendo da versão do
-- storage.
--
-- Limite conhecido: `delete from storage.objects` apaga o REGISTRO do objeto.
-- O blob no backend (disco, no local; S3, no hospedado) só sai pela Storage
-- API. No local isso é irrelevante — o `db reset` recria o volume —, e no
-- hospedado o bucket nunca chegou a ser usado por esta loja.
-- =====================================================================

-- 1. Objetos e bucket ---------------------------------------------------

-- `storage.protect_delete()` é um trigger de statement que recusa DELETE
-- direto nas tabelas de storage com `42501` ("Use the Storage API instead"),
-- exatamente para impedir a perda acidental descrita acima. O destravamento
-- é o mecanismo previsto pela própria função: ela lê esta GUC.
--
-- `set`, e não `set local`: fora de bloco de transação o `set local` só emite
-- WARNING e não vale, e a CLI não garante que cada migration venha embrulhada.
-- O `reset` no fim devolve o guarda-corpo para quem vier depois na sessão.
set storage.allow_delete_query = 'true';

delete from storage.objects where bucket_id = 'mockup-templates';
delete from storage.buckets where id = 'mockup-templates';

reset storage.allow_delete_query;

-- As policies do bucket moram em `storage.objects`, que continua existindo:
-- elas precisam ser derrubadas uma a uma, senão sobram apontando para um
-- bucket que não existe mais.
drop policy if exists "Public read access to mockup templates" on storage.objects;
drop policy if exists "Admins can upload mockup templates" on storage.objects;
drop policy if exists "Admins can update mockup templates" on storage.objects;
drop policy if exists "Admins can delete mockup templates" on storage.objects;

-- 2. Tabela, trigger e função ------------------------------------------

-- O `cascade` leva o trigger `trg_mockup_templates_updated_at` junto; a
-- função dele é objeto separado e sai logo abaixo.
drop table if exists public.mockup_templates cascade;

drop function if exists public.touch_mockup_templates_updated_at();
