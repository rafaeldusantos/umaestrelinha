## TC-FUNC-011: A faixa aparece acima do cabeçalho na Home, numa categoria e num produto, e some no checkout e no pedido montado

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-01, RN-01, UC-01
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-02, passos 1, 4 e ramo J-02b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** presença/ausência por rota; determinístico

### Objetivo

Quem vem do anúncio cai em produto ou categoria: se a faixa só existe na Home, a campanha não chega a ela. E nas telas de pagamento a faixa só atrapalha.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto, ligada (só leitura)
- Estado de partida: loja fechada; sacola vazia

### Condições reais

as da persona (celular 390 × 844, toque)

### Passos

1. Abre a Home, depois C1 (categoria) e um produto de C1
   - **Esperado:** nas três, a faixa ouro fica acima do `<header>`, na largura toda, com um aviso
2. Põe um produto na sacola e vai ao checkout (`/checkout`), sem preencher nada
   - **Esperado:** sem faixa
3. Abre `/pedido-montado` direto
   - **Esperado:** sem faixa (a tela de erro ou de link inválido que aparecer é do pedido montado, não é achado)

### Esperado e fonte

Fonte: PRD CA-01, RN-01, D-01; spec H-01 (também sem faixa: `/pedido/:id/pagamento`, `/pagar-com-cartao` e o 404)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| 404 | abre `/caminho-que-nao-existe` | sem faixa |
| link de cartão | abre `/pagar-com-cartao` | sem faixa |
| páginas fixas | abre `/politica-de-privacidade` | com faixa (está no `StoreLayout`) |
| voltar do checkout | do checkout, usa o voltar do navegador | a faixa reaparece na página anterior, sem vaga vazia |
