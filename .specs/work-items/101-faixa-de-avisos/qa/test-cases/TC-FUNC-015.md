## TC-FUNC-015: O aviso de imagem baixa uma arte só, a do dispositivo, inteira e com o texto alternativo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03, UC-02
**Autor:** dev
**Persona:** PER-04 Rodrigo
**Jornada:** J-03, passo 3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** requisições de imagem e atributo `alt` observáveis; determinístico

### Objetivo

O Rodrigo vê a arte da campanha nítida e inteira; no celular, a arte do celular. Baixar as duas pesa à toa na rede de quem está no 4G.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (A4 de imagem) — só leitura
- Estado de partida: na Home, 1440 × 900; registro de rede ligado desde o carregamento

### Condições reais

as da persona (computador 1440 × 900)

### Passos

1. Usa a seta "Próximo aviso" até o A4
   - **Esperado:** a arte do computador (1440 × 48) inteira, centralizada na faixa, sem corte nem esticamento; o nome acessível da imagem é o texto alternativo do manifesto
2. Confere as imagens pedidas pela página
   - **Esperado:** só a arte do computador foi baixada (numa rendição do tamanho da vaga), nenhuma da arte do celular
3. Estreita a janela para 390 × 844 e recarrega
   - **Esperado:** agora só a arte do celular (780 × 96) é baixada e mostrada inteira, com o ouro sobrando dos lados

### Esperado e fonte

`<picture>` com uma arte por dispositivo, rendição do tamanho da vaga, texto alternativo — fonte: PRD UC-02, CA-03; spec PR-3

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| 1024 de largura | janela em 1024 × 768 | a arte do computador inteira, contida, com ouro nos lados (PR-3) |
| arte que falha | bloqueia a URL da arte e recarrega | a faixa continua com a altura dela; registrar o que aparece no lugar |
