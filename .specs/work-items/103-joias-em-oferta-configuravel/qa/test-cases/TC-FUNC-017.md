## TC-FUNC-017: Se o editor não consegue ler as peças da campanha, nenhuma peça sai da lista e ele avisa

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.3
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-04, ramo J-04a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** falha provocada por bloqueio de rota; sem ela, a dona salvaria uma curadoria esvaziada em silêncio

### Objetivo

Uma falha de leitura nunca faz o editor tirar as peças da dona — ela salvaria um bloco vazio sem saber.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com as peças que sobraram depois do TC-FUNC-016
- Estado de partida: fora do editor de B-1

### Condições reais

as da persona

### Passos

1. Bloquear as requisições `**/rest/v1/product_campaigns*` e abrir o editor de B-1
   - **Esperado:** nenhuma peça sai da lista; o editor diz que não conseguiu conferir a campanha
   - **Esperado:** o editor não abre como alterado por causa disso
2. Tirar o bloqueio e Cancelar (ou reabrir)
   - **Esperado:** a conferência volta a funcionar; nada foi gravado

### Esperado e fonte

Se a leitura das peças da campanha falhar, nenhuma peça sai e o editor diz que não conseguiu conferir a campanha —
fonte: PRD CA-04.3; spec.md D-08 (erro de leitura nunca vira "nenhuma")

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| sem rede | ficar offline e abrir o editor | o painel diz que não conseguiu ler; nenhuma peça some |
| bloqueio não isola | se o bloqueio derrubar o editor inteiro | anotar e marcar `skip` com o motivo (o teste de componente da implementação cobre) |
