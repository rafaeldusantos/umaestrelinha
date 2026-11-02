## 04 · [supabase · packages/core · apps/store · apps/mobile-adm] Acessos — "Com sacola" e "vs semana anterior"

**Status:** done

`UC-06, UC-09 (parte)` — 90

**Objetivo.** Em Acessos, a Adri vê "Com sacola" ao lado de Visitas, Vendas e Conversão, e na Semana cada número compara com a semana anterior até o mesmo ponto; as visitas passam a ficar guardadas por 14 dias.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §O "defeito 01", §Convenções, §Os guardas, §Baselines, §CI e deploy); `apps/mobile-adm/CLAUDE.md` › A Loja ao vivo (feature 83) — Fase 1 · Testes; `packages/core/CLAUDE.md` › `live` · `stats`; `supabase/CLAUDE.md` › Migrations · `visit` — a visita única · A hora da primeira visita e a chave `acessos`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: `prune_store_visits`, `store_movement`, `movement.ts`, `access.ts`, `SecaoAcessos`); §6 · spec.md — Decisões D-02, D-03.

**Depende de.** 01 — a marca diária "com sacola" por (dia, id da presença) com a hora da primeira sacola, e a poda dela em 14 dias. Confira que existe antes de começar.

### Critérios de aceite

**LAV-51 (e LAV-50, LAV-52..54, que já existem e não podem regredir)**

- **LAV-50** Seletor Hoje / Ontem / Semana (segmentado, `aria-pressed`), começando no mesmo período escolhido no Início quando vier de lá. Trocar de período **não lê de novo**: tudo vem numa resposta, como no `MovementHero`.
- **LAV-51** Quatro números, cada um com a variação contra o período anterior ("+12% vs ontem", "−5% vs semana anterior", que compara de segunda até a hora completa atual com a semana anterior de segunda até o mesmo dia e a mesma hora, nos quatro números, e não aparece sem a semana anterior contada até esse ponto; verde `done` para alta, `ink-soft` para baixa, nunca vermelho):
  1. **Visitas**: `store_movement…visitas` (visitantes únicos). **Mesmo número da faixa do Início.**
  2. **Com sacola**: das visitas do período, quantas tiveram ao menos uma joia na sacola em algum momento. No dia, cada navegador conta uma vez, na mesma régua de Visitas, e o número nunca passa de Visitas. Na Semana, é a soma dos dias (quem pôs joia na sacola em dois dias conta duas vezes), e a tela diz isso em letra pequena. A variação segue as regras de Visitas (em Hoje, as horas completas contra ontem até a mesma hora) e não aparece enquanto o período anterior não tiver sido medido inteiro desde a publicação.
  3. **Vendas**: `store_movement…vendas`.
  4. **Conversão**: vendas ÷ visitas, com 1 casa decimal; "—" quando visitas = 0.
  - ⚠️ O protótipo mostra "Visitas" e "Visitantes únicos" separados. **Unificar em "Visitas"**: a loja só mede visitantes únicos (VIS-15), e dois números para a mesma coisa confundem.
- **LAV-52** Gráfico:
  - **Hoje e Ontem:** "Visitas por horário", 8 faixas de 3 h (0h, 3h … 21h). A faixa em andamento fica em dourado; as futuras aparecem como trilho vazio (`line`). Conta cada visitante **na hora da primeira visita do dia**.
  - **Semana:** "Visitas por dia", **de segunda até hoje**, a mesma régua da `store_movement`. O protótipo mostra 7 dias corridos; seguir a régua do banco para o total bater com o gráfico.
- **LAV-53** A nota sob o gráfico explica a régua: "Faixas de 3 horas, pela hora da primeira visita." / "Desde segunda-feira."
- **LAV-54** Contagem limitada: se `teto_dia` vier preenchido, mostrar "Mais de 5.000 visitas neste dia — o número é um mínimo." Se a contagem começou depois do início do período (`contagem_desde_dia`), mostrar "Contando desde {data}."

**§10 (critério 1)**

## 10. Critérios de aceite (resumo)
1. Os números de Visitas e Vendas da Loja ao vivo são **idênticos** aos da faixa do Início para o mesmo período.
2. A soma Olhando + Sacola + Checkout é igual ao total "Agora na loja".
3. Um navegador sem consentimento, robô, host interno ou com opt-out nunca aparece em nenhum número.
4. Fechar a aba da loja tira a pessoa do total em até 5 min.
5. Com o app em segundo plano, não sai nenhuma leitura.
6. O banco não guarda IP, user agent, referrer nem URL (teste de esquema).
7. O cartão do Início na Fase 1 não mostra nenhum número ao vivo.


**§11 Fora do escopo (o teto da retenção)**

## 11. Fora do escopo
- Mapa de calor, gravação de sessão, identificação de clientes logadas ("Juliana está na loja").
- Notificação push de "alguém no checkout": combina mal com o tom memorial. Pode ser reavaliada como opção desligada por padrão.
- Histórico além de 14 dias. As visitas passam a ficar guardadas por 14 dias, o necessário para comparar a semana atual com a anterior; nada além disso.


### Design — o que a tela faz

Fonte: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html` (etag `1793064028832969`); cópia local `.specs/features/83-loja-ao-vivo/prototipo/Atelie-Admin.dc.html` e capturas em 390 na mesma pasta (`02-inicio-cartao-agora-na-loja.png`, `03-ao-vivo-topo-390.png`, `05-ao-vivo-fim-390.png`). **A UI segue o protótipo** (pedido do usuário) em estrutura, tokens e medidas; onde o protótipo diverge do `prd.md`, vale o `prd.md`.

- A seção Acessos já existe (feature 83). Muda só: os números passam a ser **quatro** — Visitas, Com sacola, Vendas, Conversão — na grade `auto-fit` (piso `9rem`) que cai para 2×2 em 390 como no protótipo (cartão padding 16, rótulo 11/600 caixa alta, valor display 700 22px `primary`, variação 12px); a variação da Semana aparece ("−5% vs semana anterior"), `done` para alta e `ink-soft` para baixa; e uma nota em letra pequena na Semana dizendo que "Com sacola" é a soma dos dias. O protótipo chama o segundo número de "Visitantes únicos"/"Sacolas criadas": vale o PRD ("Com sacola").

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `prune_store_visits` | JÁ EXISTE (migration da 71). **Recrie** em migration nova com 14 dias (`AD-017`) | | |
| `store_movement` | JÁ EXISTE (`20261029120000_83-loja-ao-vivo.sql`). **Recrie** em migration nova: `comparacao.semana` (de segunda até a hora completa atual contra a semana anterior até o mesmo dia e hora, nos quatro números; `null` quando a semana anterior não foi contada até esse ponto) e "Com sacola" por período (dia: navegadores distintos da marca diária limitados por Visitas do dia; Semana: soma dos dias; Hoje comparado por horas completas pela hora da primeira sacola). `periodos` e as chaves de antes ficam idênticos; o snapshot de `store_visits` continua em UM `from public.store_visits` | o painel e o app | |
| marca diária "com sacola" | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |
| tipo `StoreMovement` (`packages/core/src/stats/movement.ts`) | JÁ EXISTE. Altere: `comparacao.semana` e o número novo | | |
| `accessCards`, `comparisonLabel`, `parComparado`, `AccessCard` (`packages/core/src/live/access.ts`) | JÁ EXISTE. Altere | | |
| `SecaoAcessos` | JÁ EXISTE. Altere | | |

### Decisões já tomadas

- D-02: "Com sacola" por (dia, id da presença) com a hora da primeira sacola (para a variação de Hoje por horas completas); Semana = soma dos dias.
- D-03: "Com sacola" é lido em `store_movement`, na chave `acessos`, ao lado de Visitas; o número é limitado por Visitas no dia (`least`).
- `BL-056`: retenção de `store_visits` de 8 para 14 dias; a Política já diz 14 dias (tarefa 01).
- A variação continua sem linha quando o período anterior é 0 ou não foi medido inteiro; arredondamento e tons da 83 valem igual.
- O Backoffice lê `periodos` de `store_movement` e não lê `comparacao` — `periodos` não pode mudar.
- Migration: prefixo único **maior que o da tarefa 01**; a tarefa 02 corre em paralelo com prefixo = o da 01 + 1 hora; **use o da 01 + 2 horas** (ex.: `…140000` se a 01 usou `…120000`).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Recriar RPC com snapshot único e portão `has_role` primeiro | `supabase/migrations/20261029120000_83-loja-ao-vivo.sql › store_movement` |
| Poda | `supabase/migrations/20261021120000_71-visitas-unicas.sql › prune_store_visits` |
| Cartões e comparação | `packages/core/src/live/access.ts › accessCards` / `comparisonLabel` / `parComparado` |
| Guarda das migrations de visitas | `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts`, `visitasPorHoraSchema.test.ts`, `visitasRegras.ts` |
| Probe | `.specs/features/83-loja-ao-vivo/probes/01-acessos.sql` |

### Testes

- Unidade `packages/core`: os quatro cartões na ordem; "Com sacola" com o número e a variação; a variação "vs semana anterior" só quando o servidor a manda, e sem linha com base 0 ou `null`; a nota da soma dos dias na Semana.
- Componente (`SecaoAcessos` pela página real): quatro números; a variação da Semana; a nota; Visitas e Vendas idênticos aos da faixa do Início para o mesmo período (critério 1).
- Integração local (probe `begin … rollback` contra a 54442): `periodos` idêntico ao de antes; semana anterior até o mesmo dia e hora; "Com sacola" ≤ Visitas no dia; Semana = soma dos dias; a variação some sem o período anterior medido; a poda de `store_visits` passa a 14 dias; os probes da 71 e da 83 (`01-acessos.sql`, `02-gravacao-real.sh` e os da 71 por nome) seguem com exit 0 e só `ok —`.
- Guardas que reagem, atualizados para a migration vigente sem afrouxar: `visitasSchema` (a poda lida da migration vigente, com 14 dias), `visitasPorHoraSchema` (vigente de `store_movement` é a desta tarefa; `periodos` byte a byte; um `from public.store_visits`; colunas de `store_visits` iguais), `visitasRegras.ts` (`PISO_DA_71`/`FILTROS_DA_71`).

### Obrigações

- `store_visits` não ganha coluna (`visitasPorHoraSchema.test.ts` fixa `day, visitor_id, first_hour` em todas as migrations).
- Gate de probe (`BL-057`): quem recria `store_movement` roda os probes da 71 e da 83 antes de fechar.
- `packages/core/src/live/index.ts` (o barril) é da tarefa 02, que roda em paralelo: **não o edite**; os símbolos de `access.ts` já são reexportados por ele.
- Toda `transition-*` com par `motion-reduce:`; ouro só sobre `ink`.
- `Migration nova em `supabase/migrations/`: apure o maior prefixo existente na hora (hoje o último é `20261103120000_89-pedido-montado.sql`) e use um prefixo maior e único; compare o **prefixo**, não o nome (`CLAUDE.md` › o merge da 48/49). Aplique só no local: `supabase migration up --local` (nunca `--linked`, nunca `supabase stop --all`). Confira `supabase status` antes; sem o local de pé, pare e relate.
- Gate: suítes de `packages/core`, `apps/mobile-adm`, `apps/store` e `apps/backoffice`, um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe.

### Não faça

- Não toque nas tabelas nem na gravação da presença (tarefa 01), em `store_live`, no hook nem no cartão do Início (tarefa 02), nem nos blocos A–E (tarefa 03).
- Não edite `packages/core/src/live/index.ts`, `card.ts` nem o arquivo novo da presença em `live/` (tarefa 02, em paralelo).
- Não amplie a retenção além de 14 dias.
- Nada de commit, nada de `--linked`.

### Pronto quando

- [ ] Acessos mostra quatro números — Visitas, Com sacola, Vendas, Conversão — e Visitas e Vendas batem com a faixa do Início
- [ ] a Semana mostra "vs semana anterior" comparando até o mesmo dia e hora, e some sem a semana anterior contada até ali (probe)
- [ ] "Com sacola" nunca passa de Visitas no dia, e a Semana é a soma dos dias, com a nota
- [ ] `store_visits` é podada em 14 dias, e `periodos` não mudou
- [ ] os probes da 71 e da 83 seguem com exit 0
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` §Comandos e §Baselines; o que ele não declara, `.specs/project/PROJECT.md` › Comandos de verificação)

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
