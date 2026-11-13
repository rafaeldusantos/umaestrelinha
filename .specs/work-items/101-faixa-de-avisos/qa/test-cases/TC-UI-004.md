## TC-UI-004: A faixa da loja confere com o protótipo da Black Friday

**Tipo:** ui
**Prioridade:** P2
**Origem:** UC-01, UC-02
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** n/a
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência contra o Claude Design; sem o MCP, `not-run`

### Objetivo

A Adri aprovou o desenho da faixa ouro; a loja tem de entregar o que ela viu.

### Pré-condições

- Conta: `admin-loja` (a loja é lida sem login, no mesmo navegador)
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: na Home da loja

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | os frames que o protótipo tiver (390 e/ou 1440) |

### Protótipo e tela

`claude_design` · projeto `4abe021d-d77e-4fe7-affd-524180315fa3` · arquivo `Black Friday - Home.html` (`FaixaTopo` em `bf-loja.jsx`, `.faixa*` em `bf.css`) × a faixa da loja

### Propriedades a comparar

| Propriedade | Do design |
| --- | --- |
| fundo e texto | token `accent` e `ink` sólido |
| tipografia | 13 px no celular, 14 px a partir de 768; altura de linha 18 px; peso 500; destaque 700; rótulo 600 sublinhado, afastado 3 px |
| miolo | máx. 1280 px, recuo 8 px, 4 px entre itens |
| setas | área visível 32 × 40, chevron 16 px em `ink` |
| ordem | [seta anterior] [conteúdo] [seta próximo] |

### Passos

1. Lê a faixa no protótipo e anota os valores
2. Compara cada propriedade na loja, por valor computado, no viewport do frame
   - **Esperado:** igual depois de normalizar

### Esperado e fonte

Fonte: protótipo `Black Friday - Home.html`. O que o PRD decidiu diferente vale o PRD, e **não é diferença**: giro 6 s (não 5), pausa também com o dedo, altura fixa por dispositivo (não mínima que cresce) — spec › Design, tabela de divergências

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| foco | Tab até a seta | anel em `ink` (o design não desenha foco — anotar, não comparar) |
