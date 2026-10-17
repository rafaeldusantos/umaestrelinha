# QA Run Report — 2026-10-17 — retirada-no-escritorio

- **Scope:** feature `63` (retirada no escritório), commitada em `951464f` e publicada em `origin/master`.
  Ativação (preencher o endereço do Material no painel) + a opção na calculadora do produto e no checkout.
- **Cadence tier:** targeted
- **Build:** `2ea5542` + working tree (alterações da `64`, sem relação) · **Environment:** `pnpm dev` (loja :8082, painel :8083),
  Supabase local :54441 com o mesmo estado de produção (`pickup_enabled = true`, **sem** linha `material`).
  Melhor Envio só cotação. Nenhum pagamento enviado.
- **Started:** 2026-10-17 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri (dona) | administra a loja, ativa a retirada | 1440×900 e 390×844, pt-BR | CH-ativar-painel |
| Cliente de Porto Alegre | compra pelo celular, CEP do RS | 390×844, pt-BR | CH-produto-rs-mobile, CH-checkout-rs-mobile |
| Cliente de São Paulo | compra no computador | 1440×900, pt-BR | CH-fora-rs-desktop |
| Cliente de Porto Alegre no computador | | 1440×900 | CH-checkout-rs-desktop |

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-antes-ativar | endereço ausente ⇒ retirada some na loja (RET-05) e painel avisa (RET-21) | Adri + Cliente POA | Configuration | Pass | | |
| 2 | CH-ativar-painel | preencher endereço do Material e salvar; aviso some | Adri | Configuration | Pass | | |
| 3 | CH-produto-rs-mobile | calculadora do produto com CEP do RS (RET-01, RET-03) | Cliente POA 390 | Money | Pass | | |
| 4 | CH-fora-rs-desktop | CEP de SP ⇒ sem retirada (RET-02, RET-06 par) | Cliente SP 1440 | Money | Pass | | |
| 5 | CH-checkout-rs-mobile | checkout: grupos, escolher retirada, frete 0, resumo, troca de CEP (RET-06..11) | Cliente POA 390 | Money | Pass | | |
| 6 | CH-checkout-rs-desktop | checkout em 1440 + pedido gravado + /pedido/:id + painel (RET-07, RET-14, RET-19) | Cliente POA 1440 | Money | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

Driver: `agent-browser` (Chromium). Evidência em `../evidence/2026-10-17-retirada-no-escritorio/` (local, gitignored).
**Paridade:** o admin `admin@umaestrelinha.dev` do `seed.sql` não existia no banco local e foi recriado com o bloco do próprio seed.

### CH-antes-ativar — estado idêntico à produção
- **Ran:** produto "Anel Afetivo 6 Corações…" em 390, CEP 90010-000; depois `/admin/configuracoes/frete-e-material` em 1440.
- **Findings:** só "SEDEX — Correios R$ 16,61", sem "Retirar em" (`01-…`). O painel mostra o interruptor ligado e o aviso "A retirada no escritório não aparece na loja enquanto o endereço do Material não tiver logradouro, bairro e cidade." (`02-…`).
- **Scenarios settled:** RET-05, RET-20, RET-21 → pass.

### CH-ativar-painel — Adri ativa
- **Ran:** card Material: destinatário, Rua dos Andradas, 1234, sala 501, Centro Histórico, Porto Alegre, RS, 90020-000 → Salvar.
- **Findings:** gravado em `store_settings.material` (conferido no banco); o aviso some e continua ausente depois de recarregar (`03-…`).

### CH-produto-rs-mobile
- **Findings:** grupos "Envio a domicílio" e "Retirar em", linha `Escritório - Uma Estrelinha - Rua dos Andradas, Centro Histórico, Porto Alegre/RS`, "Pronta para retirada a partir de 20 de outubro", "Grátis". Sem número nem complemento. `scrollWidth` 390 (`04-…`).
- **Scenarios settled:** RET-01, RET-03 → pass.

### CH-fora-rs-desktop
- **Findings:** CEP 01310-100: só PAC R$ 27,15 e SEDEX R$ 40,84 (`05-…`). RET-02 → pass.

### CH-checkout-rs-mobile
- **Ran:** convidada, CEP 90010-000 → escolhe retirada → Continuar → recarrega → Alterar → CEP 01310-100.
- **Findings:** dois grupos; SEDEX vem marcado e a retirada não (`06-…`). Escolher a retirada leva o botão de R$ 323,42 para R$ 306,81; o resumo recolhido mostra "Retirada no escritório", a linha do escritório e "Grátis", e sobrevive ao F5 (`07-…`). Trocando para CEP de SP a retirada some e a escolha é desfeita ("Continuar" desabilitado) (`08-…`). Número da casa continua obrigatório.
- **Scenarios settled:** RET-06, RET-08, RET-09, RET-10, RET-11 → pass.

### CH-checkout-rs-desktop
- **Ran:** convidada, CEP 91330-000, retirada, PIX, CPF de teste → "Pagar".
- **Findings:** resumo lateral "Retirada no escritório · Grátis", total R$ 306,81 (`10-…`). Pedido #0183 gravado com `shipping_service_id='retirada'`, `shipping_method='Retirada no escritório'`, `shipping_carrier='Uma Estrelinha'`, `shipping_cost=0`, sem `delivery_estimate_*`. `/pedido/:id` mostra a entrega como retirada e a jornada termina em "Retirado no escritório", sem "A caminho" (`12-…`). No painel: "Pedido de retirada no escritório — sem etiqueta." (`13-…`). Pedido e conta de convidada **apagados** do banco local depois.
- **Surprises:** a geração do PIX falhou (`11-…`) — `mercado-pago` local responde 503 `BOOT_ERROR` (`Failed resolving types` em `@estrelinha/supabase/types`), o defeito já registrado no CLAUDE.md. Produção responde 400 normal a um POST vazio: é só do runtime local, fora da `63`.
- **Scenarios settled:** RET-07, RET-14, RET-19 → pass.

## Findings

Nenhum defeito da feature `63`. Observações:
- Ambiente: `mercado-pago` local em 503 BOOT_ERROR (pré-existente, não da `63`; produção ok).
- Para o CEP 90010-000 o Melhor Envio devolve só SEDEX (sem PAC); não investigado — é resposta da API.
- Não exercitado aqui: RET-04 (cotação falhando), RET-12/15/17/18 (servidor/e-mail) — cobertos pela suíte e pela prova de 2026-10-11.

## Decisions for a Human

- **Ativar em produção:** preencher o endereço do escritório em `/admin/configuracoes` → Frete e Material → card Material (logradouro, bairro, cidade e UF) e salvar. Produção hoje tem `pickup_enabled = true` e **nenhuma** linha `material`, por isso a retirada não aparece. Esse endereço também passa a aparecer na página "Como enviar o material".

## Final Status

**Ready for release — a feature 63 já está em produção e funciona.** Falta só um passo de operação: preencher o endereço do escritório no painel (veja Decisions for a Human). Nenhum defeito encontrado: Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 · Friction 0. Os 6 charters foram percorridos, todos `Pass`.

**Exit gate.** A árvore estava **compartilhada com outra sessão** que editava 55 arquivos durante a corrida, só com mudanças de texto e nenhuma linha de retirada. Resultados:
- `functions`: **974/974, exit 0**.
- `core` (completo): **7 failed / 2798 passed**, todos em `authErrorMessage`. Os testes ainda esperam o texto antigo que a outra sessão está trocando em `core/auth/errors.ts`. Não é da 63.
- `store` (completo): **61 failed / 4673 passed** (25 de 275 arquivos), em auth, guia de material, CategoryPage e outros. A origem é a mesma troca de texto.
- `backoffice` (completo): **3205/3205, exit 0**.
- Suítes da 63, rodadas isoladas: `core/src/shipping` **108/108**, e no store pickup + DeliveryBlock + calculadora **93/93**.

Remeça a suíte completa quando a outra sessão terminar.
