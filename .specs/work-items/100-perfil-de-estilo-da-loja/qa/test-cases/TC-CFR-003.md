## TC-CFR-003: O card do perfil e a prévia se usam só pelo teclado, com foco visível, e o Esc devolve o foco

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — acessibilidade do card e do modal novos (spec H10: Dialog do `@estrelinha/ui`, Esc, foco e retorno)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1 a 4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** teclado e árvore de acessibilidade no browser da sessão

### Objetivo

A escolha tem de funcionar para quem não usa mouse.

### Pré-condições

- Conta: `admin-loja`
- Massa: S0
- Estado de partida: Dados da loja, foco no topo da página

### Condições reais

| Dimensão   | Valor      |
| ---------- | ---------- |
| Modalidade | só-teclado |

### Categoria

Acessibilidade.

### Metas

| Observável                                         | Alvo                      | Aceitável |
| -------------------------------------------------- | ------------------------- | --------- |
| as opções num grupo de rádio com nome "Perfil de estilo" | sim (snapshot)      | —         |
| setas trocam a opção marcada                       | sim                       | —         |
| foco visível em cada parada                        | sim                       | —         |
| Esc fecha o modal e o foco volta ao botão          | sim                       | —         |
| alvo de toque das ações                            | ≥ 44 px                   | —         |

### Passos

1. Tab até o grupo, setas entre as opções
   - **Esperado:** a opção marcada muda; foco visível
2. Tab até "Ver a loja com este perfil", Enter
   - **Esperado:** o modal abre com o foco dentro dele
3. Esc
   - **Esperado:** fecha; foco em "Ver a loja com este perfil"

### Esperado e fonte

Modal com Esc, foco e retorno do Radix; radiogroup com rótulo — fonte: spec › Design (card), H10.

### Variações

| Variação | Ação                      | Esperado                        |
| -------- | ------------------------- | ------------------------------- |
| Tab no modal | Tab até o fim e além  | o foco não sai do modal         |
