## TC-INT-002: O pedido guarda o preço cobrado, o cheio e a campanha, e encerrar a campanha não o muda

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-13
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passo 7 (e J-06a)
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** efeito em outro módulo (o pedido no painel e na loja); conferível pelo browser; pedido de automação E2E

### Objetivo

O que a cliente comprou fica registrado como foi cobrado, e o fim da campanha não reescreve a história do pedido.

### Pré-condições

- Conta: `admin-loja`
- Massa: o pedido de convidada do CH-04 com M-A (20 %) e M-E; a Black Friday em vigência no passo 1 e encerrada no passo 2
- Estado de partida: `/admin/pedidos`

### Condições reais

as da persona

### Passos

1. Antes de encerrar, abre o pedido do CH-04 em `/admin/pedidos/:id`
   - **Esperado:** M-A com o preço cobrado (com desconto) e o cheio; a linha "Desconto de campanha"; o total; anotar os valores
2. Depois de "Encerrar agora" (TC-FUNC-017), abre o mesmo pedido de novo
   - **Esperado:** os mesmos valores de antes, item por item, e o mesmo total
3. Abre o mesmo pedido na loja (`/pedido/:id`)
   - **Esperado:** os mesmos valores
4. Na edição da Black Friday, procura "Apagar"
   - **Esperado:** desligado, com o motivo (a campanha foi usada em pedido)

### Esperado e fonte

O pedido guarda o preço cobrado, o cheio, a campanha e o percentual; encerrar depois não muda o pedido; campanha
usada em pedido não é apagada — fonte: PRD CA-13, RN-09, UC-02; `spec.md` H-10, I-06.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| app do ateliê | abre o mesmo pedido no app (`http://localhost:8084/pedidos/:id`) | os mesmos valores e a linha "Desconto de campanha" |
| e-mail | o e-mail do pedido no Mailpit (`http://127.0.0.1:54444`) | os mesmos valores do pedido |
