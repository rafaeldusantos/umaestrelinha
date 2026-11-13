## TC-CFR-002: A faixa é uma região com nome, não anuncia cada troca, e tem foco e contraste legíveis

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RN-04
**Autor:** dev
**Persona:** PER-03 Marta
**Jornada:** J-04, passos 2–4
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** árvore de acessibilidade (snapshot) e cores computadas; leitor de tela real fica fora

### Objetivo

A Marta usa só o teclado. Uma faixa que fala a cada 6 s, ou um link sem foco visível sobre o ouro, a expulsa da página.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: na Home, 1440 × 900

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Modalidade | só teclado |

### Categoria

Acessibilidade

### Metas

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| região | um landmark com nome "Avisos da loja", antes do cabeçalho | — |
| anúncio | nenhum `aria-live` (nem `role="status"`/`alert`) na faixa | — |
| setas | botões com nome "Aviso anterior" e "Próximo aviso" | — |
| ordem do Tab | a faixa vem antes do cabeçalho; seta anterior → aviso → seta próximo | — |
| foco | anel visível em `ink` sobre o ouro, em cada item focável | — |
| contraste | texto `ink` sobre `accent` ≥ 4,5:1, nas cores computadas | — |
| imagem | o A4 com o texto alternativo do manifesto como nome | — |

### Passos

1. Tira o snapshot da árvore de acessibilidade com o A1
2. Percorre com Tab desde o topo da página, com screenshot a cada parada na faixa
3. Mede as cores computadas do texto e do fundo da faixa
4. Avança até o A4 e lê o nome da imagem no snapshot

### Esperado e fonte

Fonte: PRD RN-04, UC-01; spec H-11, PR-9. O contraste "nos dois perfis do WI 100" mede só o perfil atual: o WI 100 ainda não existe (session-summary › Pendências)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| 390 × 844 | Tab no celular (teclado externo) | o link do aviso é focável, com foco visível; não há setas |
