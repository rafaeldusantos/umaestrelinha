# QA — Nanita Store

Árvore de QA viva. Um único tree, commitado, ao qual **todo ciclo acrescenta** — nunca um `qa/` por
rodada. `qa-report` planeja (personas, journeys, cenários, charters); `qa-execution` executa e escreve
os vereditos de volta nos mesmos arquivos.

## A premissa que governa tudo: mobile primeiro **na loja**

**~90% dos acessos da loja vêm de celular.** Registrado como convenção de projeto no `CLAUDE.md`.
Consequência para o QA da loja, sem exceção:

- **Toda sessão começa em 390×844** (iPhone 14/15). Desktop 1440 é a segunda passada, não a primeira.
- Um bug que só aparece no mobile é **mais severo**, não menos.
- Um cenário validado apenas em desktop tem `qa_status: untested` — não `pass`.
- Ordem dos charters: o de maior risco no mobile primeiro, enquanto a atenção está fresca.

O que quebra primeiro no mobile e é conferido em toda sessão: texto embrulhando dentro de pílula ou
badge, linha de itens estourando a largura, CTA fixo brigando com a barra do sistema, alvo de toque
abaixo de 44px, e **scroll horizontal do body** (nunca deve existir).

**O backoffice é a exceção declarada:** é ferramenta de desktop (`A31` da feature `14`), a sessão
começa em **1440×900** e bug de layout mobile ali não é bug. A regra completa e o porquê estão na
nota de viewport de [`personas.md`](./personas.md).

## Códigos de área (ids de cenário)

| Código | Área |
| ------ | ---- |
| `CHK` | Checkout one-page: blocos, acordeão, resumo, CTA |
| `SHP` | Frete: cotação Melhor Envio, CEP, prazo, frete grátis |
| `PAY` | Pagamento: PIX, cartão, Orders API do Mercado Pago |
| `ORD` | Pedido e confirmação: `/pedido/:id`, timeline, status |
| `ADR` | Endereço: ViaCEP, endereço salvo, reaproveitamento |
| `BMP` | Order bump |
| `AUTH` | Login, código de 6 dígitos, Google, reset de senha |
| `ACC` | Área de conta do cliente |
| `ADM` | Backoffice — navegação, login admin, o que não é de catálogo |
| `PRD` | Formulário de produto: 5 abas, eixos, grade de variações, validação, rascunho, checklist, URL/301 |
| `MED` | Mídia do produto: upload, alt-text, selo de mockup, estúdio, imagem por variação |
| `LST` | Listagem v2 de produtos: consulta no servidor, visões, filtros, busca, edição inline |
| `BLK` | Lote: barra de massa, edição em massa, grade rápida, exportar, excluir |
| `CAT` | Categorias: árvore, hierarquia, contagem no servidor, massa |

Área nova entra **aqui primeiro**, depois no cenário.

## Pontos de entrada

| Superfície | URL | Como subir |
| ---------- | --- | ---------- |
| Loja | `http://localhost:8080` | `pnpm dev:store` |
| Backoffice | `http://localhost:8081` | `pnpm dev:backoffice` |
| ↳ login admin | `/admin/login` | seed: `admin@nanapin.dev` |
| ↳ listagem de produtos | `/admin/produtos` | — |
| ↳ formulário (novo / editar) | `/admin/produtos/novo` · `/admin/produtos/:id/editar` | — |
| ↳ grade rápida | `/admin/produtos/grade-rapida` | — |
| ↳ categorias | `/admin/categorias` | — |
| Supabase API | `http://127.0.0.1:54321` | Docker local, já rodando |
| Supabase Studio | `http://127.0.0.1:54323` | idem |
| Mailpit | `http://127.0.0.1:54324` | idem — **não recebe os e-mails de auth**, ver abaixo |

Banco: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

**E-mail de auth não passa pelo Mailpit.** `[auth.email.smtp]` está ligado apontando para o Resend,
então o código de login sai de verdade, para a caixa real — **Mailpit vazio é o esperado, não
sintoma**. Ler o contrário foi o que produziu o `BUG-20260728` ("nenhum e-mail enviado", quando o
envio estava sendo recusado com um erro visível). O ponto de observação certo é
`docker logs supabase_auth_nanapin-store` — a falha de SMTP aparece como `gomail: ... 550 ...`,
junto de `"path":"/otp","status":500`. Para testar o login, use um e-mail real seu.

**Antes de exercitar pagamento:** `supabase stop && supabase start`. O edge runtime local monta um bind
mount por arquivo importado no boot, e a edge function `mercado-pago` passou a importar módulos novos
do `@nanapin/core` — sem o restart o worker devolve 503 "Module not found". `db reset` **não** resolve
isso, e além disso derruba os grants do schema `public` (a loja volta em 401).

## Restrições de ambiente conhecidas

Herdadas das validações de sandbox das features 08 e 09 — são ambiente, não defeito:

- **Sandbox do Mercado Pago exige e-mail `@testuser.com`** no pagador. Usar
  `test_user_...@testuser.com` no bloco Contato; qualquer outro domínio devolve
  `invalid_email_for_sandbox`.
- **O Mastercard de teste `5031 4332 1540 6351` devolve `invalid_transaction_amount` em qualquer
  valor** nesta conta (o BIN 503143 não existe no `payment_methods/search`). Usar o Visa
  `4235 6477 2802 5682`.
- **`notification_url` não pode ir no corpo** da Orders API — a URL fica só no painel do MP. Já
  corrigido no código; se voltar, é regressão de HTTP 400 `unsupported_properties`.

## Política de evidência

Screenshots só em **checkpoint e falha** — estado de objetivo alcançado, divergência, reprodução de
bug. Nunca passo a passo. `evidence/` e `state.csv` são gitignored: o relatório datado é o registro
durável e referencia as imagens por caminho.

## Como consultar

```bash
# cenários falhando
grep -l 'qa_status: fail' docs/qa/scenarios/

# cenários que nunca foram andados
grep -l 'qa_status: untested' docs/qa/scenarios/

# planilha completa (view gerada, não commitada)
python3 .claude/skills/qa-report/scripts/materialize_state.py docs/qa
```

## Origem

Tree criada em 2026-07-28, no ciclo de QA das features `08-checkout-one-page` e
`09-checkout-orders-api`. Não havia QA docs antes — nada a adotar ou migrar.

As validações spec-driven dessas features vivem em `.specs/features/*/validation.md` e **não** foram
copiadas para cá: são prova de teste e de sandbox, indexadas por caminho. O que este tree cobre é
outra coisa — o que uma pessoa real vive ao usar a loja.
