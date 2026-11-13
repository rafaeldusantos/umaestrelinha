## TC-FUNC-013: No celular não há setas, o aviso inteiro é o link, e o aviso sem destino é só texto

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-01, CA-04
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-02, passo 3
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** papel de link pelo snapshot; determinístico

### Objetivo

No celular a Bia toca onde o polegar alcança. Se só a palavra sublinhada fosse o link, ela erraria o alvo; se o aviso sem destino parecesse link, ela tocaria em vão.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: na Home

### Condições reais

as da persona

### Passos

1. Olha a faixa com o A1
   - **Esperado:** nenhuma seta; o destaque "Black Friday", o texto e "Ver ofertas" (sublinhado) formam um link só, levando a C1
2. Toca no começo do aviso (sobre "Black Friday")
   - **Esperado:** abre C1
3. Espera o A3 ("Frete grátis …")
   - **Esperado:** texto sem link (nenhum papel de link no snapshot); tocar nele não navega
4. Espera o A4 (imagem) e toca na arte
   - **Esperado:** abre C1

### Esperado e fonte

Fonte: PRD UC-01 ("Celular: sem setas; … o aviso inteiro é o link"; "Sem link, é texto"), CA-04; Design (aviso de texto é um link inteiro)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| rolar arrastando sobre a faixa | arrasta o dedo de cima para baixo começando na faixa | a página rola; não abre o link |
