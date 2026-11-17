## TC-UI-001: A fileira das peças escolhidas rola no celular, vira fita com setas no computador e reserva uma vaga por peça ao carregar

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-03.3, RNF-04
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-02, passo 2 e ramo J-02a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** comportamento de layout e de carregamento — julgamento visual em dois viewports e rede lenta

### Objetivo

A cliente passa pelas peças sem a página rolar de lado nem pular quando elas chegam.

### Pré-condições

- Conta: `anonima`
- Massa: B-1 com três peças escolhidas (CH-01)
- Estado de partida: Home da loja

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844), depois desktop (1440 × 900) |
| Rede        | lenta no passo 1                                 |
| Locale      | pt-BR                                            |
| Modalidade  | toque; mouse no desktop                          |

### Passos

1. Com a rede lenta, recarregar a Home e observar o bloco enquanto carrega
   - **Esperado:** a fileira reserva **três** vagas (uma por peça escolhida); quando as peças chegam, o rodapé e os
     blocos abaixo não se deslocam
2. Em 390 × 844, passar a fileira de lado
   - **Esperado:** a fileira rola de lado; o corpo da página não rola na horizontal
3. Em 1440 × 900
   - **Esperado:** a fileira continua uma fita (não vira grade), com as setas que rolam

### Protótipo e tela

Sem protótipo novo: a referência é o bloco da WI 102 e a forma `slider` do carrossel de "Produtos em destaque"
(fita no celular e no computador, com setas). Tela: Home da loja, bloco "Joias em oferta".

### Propriedades a comparar

número de vagas no carregamento · rolagem horizontal do corpo (`scrollWidth` do documento × largura da janela) ·
presença das setas a partir do computador · deslocamento do rodapé

### Esperado e fonte

Fileira com todas as escolhidas na ordem: no celular rola na horizontal; no computador fita com setas; carregando
reserva uma vaga por peça; sem rolagem horizontal em 390 — fonte: PRD CA-03.3, RNF-04

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 768 × 1024 | repetir o passo 3 | fita, sem rolagem do corpo |
| movimento reduzido | rolar pelas setas | sem animação decorativa |
