# 59 · Minha Conta V2 — Context

**Gathered:** 2026-10-04
**Spec:** `.specs/features/59-minha-conta-v2/spec.md`
**Desenho:** Paper, página "59 · Minha Conta V2 — proposta"
**Status:** Pronto para Design

---

## Decisões travadas (respondidas pelo usuário em 2026-10-04)

| Pergunta | Decisão | O que isso fixa |
| --- | --- | --- |
| Pedidos com número antigo | **Renumerar só os 2 `NP-…`**; os 35 `NS-…` da Nuvemshop ficam | Migration nova com recorte `like 'NP-%'` e `nextval` da sequência da `58`. Revoga em parte o *Out of Scope* da `58` → `AD-044` |
| Até quando gerar PIX novo para o mesmo pedido | **Até 7 dias** depois de `created_at`; depois, WhatsApp | Função pura irmã de `podePagarComPix`, com a constante nomeada. É regra de oferta, não de autorização |
| Datas de "Postado" e "Entregue" | **Liberar o histórico do próprio pedido** | Função `security definer` que devolve só `status` + `created_at`, do pedido da própria cliente; o `get-order` da convidada devolve o mesmo formato |
| E-mail e CPF | **Travar o e-mail; CPF preenchível uma vez, depois trava** | Gatilho `before update` em `customers`; admin e service role continuam podendo |

## Decisões de desenho (tomadas na proposta, sem objeção)

- **O detalhe do pedido tem um dono só**: `/pedido/:id`, ampliado. A conta é lista + pendências.
- **Abas como sub-rotas**: `/conta` (Pedidos) e `/conta/dados` (Meus dados). No computador viram a
  coluna lateral de 264 px.
- **"Precisa da sua atenção"** só existe quando há pendência; pagamento antes de material.
- **Selo da situação**: régua de 9 regras do quadro "Régua dos selos" do Paper, cores derivadas da
  paleta (rosa-terra para pagamento com problema, ouro claro para "aguardando", serenity para "em
  andamento", verde-musgo para "entregue", areia para "cancelado/reembolsado"). Nenhuma cor padrão do
  Tailwind.
- **Tipografia da lista**: Outfit para número e valores (Baskerville fica para títulos de página e
  de bloco). Foi o Baskerville no número que quebrou o layout do print.
- **Endereço**: a conta edita **um** endereço, o padrão. Pedido feito não muda.

## Flexível (o Design decide)

- Como garantir "no máximo um endereço padrão" (índice único parcial × transação; ver `L-018`).
- Se a função do histórico vira RPC chamada pela loja ou também pela edge function `checkout`.
- Componentização: o que da lista da conta vira `entities/order/ui` e o que fica na página.

## Ideias adiadas (fora desta feature)

- Trocar e-mail com confirmação por código.
- Lista de endereços com rótulo e apagar.
- Pagar de novo com cartão.
- Status do pacote dentro da loja (API de rastreio).
- Avisar a cliente quando o Melhor Envio grava o rastreio (`BL-035`).
