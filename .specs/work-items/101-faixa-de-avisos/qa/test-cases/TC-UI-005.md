## TC-UI-005: A tela "Faixa de avisos" do painel confere com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** n/a
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência contra o Claude Design; sem o MCP, `not-run`

### Objetivo

A tela que a Adri aprovou é a que ela vai usar a cada campanha.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa do manifesto (só leitura — não salvar)
- Estado de partida: em `/admin/faixa-de-avisos`

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | 1440 × 900; 1023 de largura para a grade de uma coluna |

### Protótipo e tela

`claude_design` · projeto `4abe021d-d77e-4fe7-affd-524180315fa3` · arquivo `Painel - Campanhas, faixa e perfil.html`, tela **Faixa de avisos** (`adm-faixa-perfil.jsx`) × `/admin/faixa-de-avisos`

### Propriedades a comparar

| Propriedade | Do design |
| --- | --- |
| casco | grupo **Loja** (Home, Menu da loja, Faixa de avisos); trilha "Loja › Faixa de avisos"; título "Faixa de avisos" |
| cards | "Faixa ligada" (interruptor) · "Como a cliente vê" · "Avisos" com "N de 5" |
| textos literais | descrição do interruptor, ajuda do tom, rótulos e exemplos dos campos, recusa do destino |
| aviso na lista | número, resumo com mínimo de 44 px, "Subir/Descer/Tirar o aviso N" |
| corpo do aviso | "Tipo do aviso" Texto/Imagem; grade de 2 colunas, 1 abaixo de 1024 |

### Passos

1. Lê a tela no protótipo (escolhendo a tela no painel do protótipo)
2. Compara estrutura, textos e componentes na tela do painel
   - **Esperado:** igual depois de normalizar

### Esperado e fonte

Fonte: protótipo do painel. **Não são diferença** (decididas na costura): subtítulo com 6 segundos (H-15), a frase do salvo (H-14), rótulo da região "Avisos da loja" (H-11), arrastar além de subir/descer (H-08), interruptor que nasce desligado, a prévia que é a loja num iframe com seletor Celular/Computador (PR-5, I-07), o link "Black Friday" dos departamentos (H-16, fora)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| cenário "Destino externo" | escreve `https://exemplo.com` no destino (sem salvar) | a recusa no campo e a barra como no cenário do protótipo |
