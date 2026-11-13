## TC-FUNC-016: No computador, as setas trocam o aviso e o giro para com o ponteiro e com o foco

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02, CA-07, UC-01
**Autor:** dev
**Persona:** PER-04 Rodrigo
**Jornada:** J-03, passos 2 e 4
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** hover e foco determinísticos

### Objetivo

O Rodrigo quer ler os outros avisos sem esperar, e não quer que o aviso troque enquanto o mouse está em cima para clicar.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: em C1, 1440 × 900

### Condições reais

as da persona

### Passos

1. Olha as pontas da faixa
   - **Esperado:** uma seta "Aviso anterior" à esquerda e "Próximo aviso" à direita, cada uma com área de clique de pelo menos 44 × 44 px
2. Clica em "Próximo aviso" duas vezes e em "Aviso anterior" uma vez
   - **Esperado:** A1 → A2 → A3 → A2
3. Deixa o ponteiro parado sobre o texto da faixa por 15 s
   - **Esperado:** o aviso não troca; tirando o ponteiro, volta a trocar a cada ~6 s
4. Chega à faixa com Tab até o link do aviso e espera 15 s
   - **Esperado:** foco visível em `ink`; o aviso não troca enquanto o foco está dentro da faixa

### Esperado e fonte

Fonte: PRD UC-01 (setas de 44 px no computador; pausa com ponteiro e foco), CA-02, CA-07; spec PR-9

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| 768 de largura | janela em 768 × 1024 | as setas já aparecem (a partir de 768) |
| 767 de largura | janela em 767 | sem setas, o aviso é o link |
| clique duplo na seta | dois cliques rápidos | avança dois avisos, nunca para um aviso vazio |
| depois do último | "Próximo aviso" no A4 | registrar o que acontece (a fonte não diz se volta ao A1) — não é achado por si |
