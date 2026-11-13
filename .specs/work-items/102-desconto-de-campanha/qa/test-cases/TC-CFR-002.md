## TC-CFR-002: A Home e a vitrine com a campanha carregam sem deslocar o conteúdo

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — performance percebida; a Validation deixou o deslocamento do bloco da Home para a QA (`spec.md` I-10)
**Autor:** dev
**Persona:** PER-04 Rosa
**Jornada:** J-03
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida no navegador da sessão; sem orçamento no PRD — metas do guia de CFR

### Objetivo

Quem está lendo a Home não perde o lugar quando o bloco de ofertas aparece, e a vitrine mostra as peças rápido.

### Pré-condições

- Conta: `anonima`
- Massa: "Dia das Mães" em vigência; bloco "Joias em oferta" ligado
- Estado de partida: `http://localhost:8082/`, cache limpo

### Condições reais

| Dimensão    | Valor |
| ----------- | ----- |
| Dispositivo | celular (390 × 844) |
| Rede        | rápida e lenta (Slow 4G, se o driver permitir) |

### Categoria

Performance percebida

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| primeira pintura útil da Home | < 2 s | < 4 s |
| deslocamento de layout ao aparecer o bloco | o conteúdo que a persona já vê não sai do lugar | deslocamento só abaixo da dobra |
| `/ofertas` com cartões visíveis | < 3 s | < 6 s |
| troca de chip | a grade muda logo depois do toque, com sinal de carregando se demorar mais de 300 ms | — |

### Passos

1. Abre a Home e mede a primeira pintura e o deslocamento de layout até o bloco aparecer
   - **Esperado:** dentro das metas
2. Abre `/ofertas` e mede até os cartões aparecerem
   - **Esperado:** dentro das metas; sem cartão de preço de tabela trocando para o de campanha na frente da persona
3. Troca de chip três vezes
   - **Esperado:** retorno imediato; sem a grade piscar vazia

### Esperado e fonte

Metas do guia de CFR (performance percebida); I-10 ("Enquanto carrega, o bloco não reserva espaço; o CLS fica para
a QA medir").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| rede lenta | repete com a rede lenta | o bloco aparece abaixo do que já está na tela, sem empurrar o que a persona lê |
| tom | lê os textos da Home e da vitrine | nada de contagem regressiva, escassez ou exclamação (RN-14) |
