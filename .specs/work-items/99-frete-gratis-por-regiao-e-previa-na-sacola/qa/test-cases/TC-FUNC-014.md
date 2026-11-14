## TC-FUNC-014: Trocar o CEP de São Paulo para a Bahia no checkout desfaz o frete grátis e o Total sobe, sem recarregar

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-18 (PRD 99 UC-10; `spec.md` D-12, com RN-09 do PRD 97)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-02, ramo J-02a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** dinheiro, P0; a forma de cumprir vem de D-12 (trocar o CEP desfaz a escolha)

### Objetivo

Cida calculou com o CEP do trabalho e corrige no checkout para o de casa: o "Grátis" não pode sobreviver à troca.

### Pré-condições

- Conta: cliente-salvador
- Massa: Sul + Sudeste, R$ 450; peças ≥ R$ 450; fixture A
- Estado de partida: no checkout, vinda da gaveta com 01310-100 e o PAC "Grátis"

### Condições reais

As da persona.

### Passos

1. No bloco Entrega, troca o CEP para 40020-000
   - **Esperado:** a escolha é desfeita; as opções voltam; a mais barata deixa de sair "Grátis"; a URL e a página não
     recarregam
2. Escolhe o PAC
   - **Esperado:** o PAC cobrado; "Frete · PAC" com o valor no Resumo; o Total sobe pelo valor do frete
3. Troca de volta para 01310-100 e escolhe o PAC
   - **Esperado:** "Grátis" de novo e o Total cai

### Esperado e fonte

Trocar SP → BA desfaz a escolha; a mais barata deixa de ser grátis e, escolhida, o Total soma o frete, sem recarregar —
fonte: PRD 99 CA-18, UC-10; `spec.md` D-12.

### Variações

| Variação              | Ação                                                       | Esperado                                  |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| Volta à gaveta        | depois da troca no checkout, abre a gaveta                  | a gaveta mostra 40020-000 e a linha neutra (o CEP tem um dono só) |
| Duas abas             | checkout em duas abas, troca o CEP numa, recarrega a outra  | a outra reflete o CEP novo                |
