## TC-UI-001: O bloco "Compre junto" na forma "Na linha" confere com o protótipo da loja em 390 e 1440

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-03.14
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** julgamento contra o protótipo; a tela mais vista do Work Item

### Objetivo

A cliente vê o bloco que a dona aprovou no desenho.

### Pré-condições

- Conta: anonima (loja pública)
- Massa: M-01
- Estado de partida: forma "Na linha"; acesso ao MCP do Claude Design

### Condições reais

390 × 844 e 1440 × 900.

### Protótipo e tela

Claude Design, projeto "Uma Estrelinha - Loja" — https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html (forma A) × `/produtos/<slug de M-01>`.

### Propriedades a comparar

Estrutura e ordem (título, frase, uma linha por adicional com caixa, foto, nome, resumo "·", preço, link "Ver os N modelos"/"Ver opções"; painel de escolhas; rodapé de total com PIX); textos literais; tipografia, cor, espaço e raio dos tokens; estados nada marcado, marcado incompleto (mensagem de falta), completo; posição na coluna (entre variação e estoque/botão).

### Passos

1. Ler o protótipo (listar arquivos, ler o da tela) e abrir a tela em 390
   - **Esperado:** as propriedades acima iguais, depois de normalizar
2. Repetir em 1440
   - **Esperado:** idem; a nota "A joia e N peças marcadas · total" junto do botão, só no computador e só com conjunto

### Esperado e fonte

Fonte: protótipo da loja; PRD CA-03.14 prevalece em caso de divergência.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| principal indisponível | combinação indisponível | estado do protótipo ("Essa combinação está indisponível no momento.") |
