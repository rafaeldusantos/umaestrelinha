## TC-JOURNEY-001: A dona destaca um item do menu com um ícone do sistema e uma cor para cada fundo, e a loja mostra

**Tipo:** journey
**Prioridade:** P0
**Origem:** C-01, C-03, C-05, C-06
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passos 1–8
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho feliz P0 da mudança, determinístico (cores e chave fixas); pedido de automação E2E — painel e loja no mesmo teste

### Objetivo

A dona consegue, numa tela só, escolher um ícone do sistema e uma cor por fundo para um item principal, gravar, e ver a loja desenhar exatamente isso — é o valor inteiro do Work Item para ela.

### Pré-condições

- Conta: `admin`
- Massa: item A (principal, link direto, visível no computador e no celular), sem ícone do sistema e sem cor
- Estado de partida: `/admin/menu` aberta, perfil de estilo Padrão

### Condições reais

as da persona; a loja conferida a 1440 × 900 e a 390 × 844.

### Entrada

`http://localhost:8083/admin/menu`, por navegação interna, logada como `admin`.

### Passos

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre o item A | o editor com "Cor do texto" abaixo do ícone, com "Na barra do computador (fundo escuro)" e "Na lista do celular (fundo branco)" | 10 s |
| 2 | abre o seletor de ícone e escolhe a Etiqueta, no grupo "Do sistema" | a Etiqueta marcada no editor | 15 s |
| 3 | dá à barra `#E8C77A` e à lista `#8A5A2B` | cada campo com a medida verde (≥ 4,5:1) | 30 s |
| 4 | salva | gravado, sem recusa | 5 s |
| 5 | abre a loja a 1440 | o item A na barra com a Etiqueta e o rótulo com cor computada `rgb(232, 199, 122)` | 10 s |
| 6 | abre a loja a 390 e a folha do menu | o item A com a Etiqueta e o rótulo com cor computada `rgb(138, 90, 43)` | 10 s |

### Objetivo e efeitos

O item A sai na loja com o ícone Etiqueta e o rótulo na cor de cada superfície. Efeito: o documento do menu leva a chave `etiqueta` e as duas cores do item A; os outros itens não mudam.

### Caminho de abandono

J-01a (cor ilegível recusada) — TC-FUNC-005; J-01c (desistir com "Usar a cor padrão") — TC-FUNC-007.

### Esperado e fonte

Ícone do sistema escolhido e cor por superfície desenhados na barra e na folha — fonte: `plan.md` C-01, C-03, C-05, C-06; Design › Editor do item e › Loja.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| cor pelo seletor nativo | escolher `#E8C77A` pelo componente de cor em vez do código | o campo hex mostra o mesmo código; mesmo resultado na loja |
| outro ícone do sistema | Porcentagem ou Cupom no lugar da Etiqueta | o ícone escolhido nas duas superfícies |
