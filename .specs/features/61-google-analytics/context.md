# 61 · Google Analytics 4 — Context

**Gathered:** 2026-10-05
**Spec:** `.specs/features/61-google-analytics/spec.md`
**Status:** Spec escrita — aguarda confirmação do usuário antes do Design

---

## Feature Boundary

Fase 1 da medição: GA4 na loja (eventos de comércio eletrônico no navegador, `purchase` pelo
servidor), o aviso de medição com opção de recusar, a Política de Privacidade atualizada, e a seção
**Google** do painel unindo Analytics (novo) e Shopping (existente).

---

## Implementation Decisions

### Propriedade e ambientes

- A loja nova usa a mesma propriedade `G-SQL517XDQZ`, inclusive na homologação.
- A homologação se separa pelo parâmetro `traffic_type=internal` + o filtro "Tráfego interno" do GA4.

### Base legal e o aviso

- **Medir sempre, com opção de recusar** (legítimo interesse). Escolhida entre opt-in e opt-out, com
  o guia de cookies da ANPD como referência e a ressalva de que não é parecer jurídico.
- O aviso segue o modelo das grandes lojas (referência mostrada pelo usuário: Americanas, banner e
  "Central de privacidade"), **mais simples e induzido ao aceite**: uma frase sem citar o Google,
  **"Aceitar" em destaque**, **"Preferências" como link discreto e menor, sem contorno**, e um X.
  Fechar ou seguir navegando não é recusar: a medição continua.
- "Preferências" abre uma folha com **duas** categorias — Necessários (sempre ativos) e Estatísticas
  (interruptor já ligado) — no lugar das quatro da Americanas: "Preferências" e "Marketing" não têm
  o que controlar nesta loja hoje. Marketing entra na fase 2, junto com os pixels.
- Ao contrário da referência, o texto **não** fala em anúncios personalizados — a loja não faz isso,
  e a política recusa afirmá-lo.

### A seção Google no painel

- `/admin/google` com abas **Analytics** e **Shopping**; `/admin/google-shopping` redireciona.
- A chave secreta da API é **só de escrita**: guardada no servidor, nunca exibida de volta, com o
  passo a passo de onde criá-la no próprio painel.
- Desenho: Paper, página "61 · Google — Analytics e Shopping".

### Google Ads, GTM, Meta, TikTok

- Fora desta feature. Sem campanhas ativas (usuário, 2026-10-05).

### Agent's Discretion

- Mecanismo de guarda da chave secreta (tabela sem policy para `anon`/`authenticated` gravada por
  edge function, ou Vault) — decidido no Design.
- Nome das chaves de `localStorage` do aviso.

### Declined / Undiscussed Gray Areas → Assumptions

- Reenvio de `purchase` que falhou, recusa × compra no servidor, e `login`/`sign_up` como P2 —
  registrados em *Assumptions* da spec.

---

## Specific References

- Aviso de cookies da Americanas (print enviado pelo usuário): faixa compacta, "Preferências" como
  texto, "Aceitar" com contorno vermelho, X para fechar; navegar sem aceitar continua medindo.

---

## Deferred Ideas

- Fase 2: Google Ads (`AW-11062333968`), Meta Pixel (`712854283845815`), TikTok — reaproveitando os
  eventos desta feature via `dataLayer`; ali a base legal provavelmente passa a ser consentimento.
- `view_promotion`/`select_promotion` nos banners da Home.
- Reenvio automático de `purchase` com falha.
