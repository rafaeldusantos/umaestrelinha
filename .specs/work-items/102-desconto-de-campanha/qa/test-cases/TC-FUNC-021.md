## TC-FUNC-021: A dona marca várias peças de uma vez e filtra a lista de produtos pela campanha

**Tipo:** functional
**Prioridade:** P1
**Origem:** R-01 — PRD UC-04; Q-01 respondida (A) em 2026-11-13
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passos 1–4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** operação em lote sobre massa conhecida (M-G); pedido de automação E2E. A variação "Desfazer" segue a resposta (A) de Q-01: o Desfazer devolve também as marcações de campanha — se ele devolver só os campos do produto, é bug

### Objetivo

A dona prepara uma coleção inteira para a próxima campanha num gesto só, consegue achar de novo quais peças estão
em qual percentual, e desfaz o lote errado sem marcar peça por peça.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência; peças de M-G sem marcação
- Estado de partida: `/admin/produtos`

### Condições reais

as da persona

### Passos

1. Cria a campanha "Natal" (01/12/2026 00:00 a 24/12/2026 23:59, 10 e 15 %, ligada)
   - **Esperado:** na lista de campanhas, "Natal · Agendada"
2. Em `/admin/produtos`, seleciona as peças de M-G e abre a edição em massa
   - **Esperado:** uma seção de campanha: escolher primeiro a campanha (Black Friday ou Natal), depois o percentual, e a opção "Tirar da {nome}"
3. Escolhe Natal → 15 % e aplica
   - **Esperado:** confirmação do lote; na lista, as peças com o percentual na linha
4. Filtra a lista pela campanha Natal e depois por 15 %
   - **Esperado:** só as peças de M-G
5. Na edição de "Natal", toca em "Ver as peças"
   - **Esperado:** `/admin/produtos` já filtrada pela campanha Natal
6. Abre uma peça de M-G na aba Preço e estoque
   - **Esperado:** dois cartões na ordem do início — Black Friday (Em vigência) e Natal (Agendada, 15 % escolhido), com a nota "A loja mostra este preço a partir de 01/12. …"

### Esperado e fonte

Marcar em lote pela edição em massa, filtrar pela campanha e percentual, "Ver as peças" — fonte: PRD UC-04,
UC-03 (mais de uma campanha); `spec.md` H-10. O Desfazer da edição em massa devolve também as marcações de
campanha ao estado anterior ao lote — fonte: resposta (A) do humano a Q-01, 2026-11-13.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| tirar em lote | seleciona duas peças de M-G e aplica "Tirar da Natal" | as duas sem marcação no Natal; a contagem cai |
| Desfazer — percentual que tinham | com M-G em 15 % no Natal, aplica Natal → 10 % nas mesmas peças e toca em "Desfazer" no aviso | na lista do painel e na aba Preço e estoque, as peças voltam a "Natal · 15 %"; o filtro "Natal · 10 %" fica vazio. Se ficarem em 10 %, é bug |
| Desfazer — sem campanha | escolhe **uma** peça de M-G (sem marcação na Black Friday), aplica Black Friday → 10 % e toca em "Desfazer" no aviso | no painel, a peça volta a "sem campanha" na Black Friday (sem percentual na linha, fora do filtro "Black Friday"); na loja (cartão e página da peça), preço de sempre, sem preço riscado e sem a faixa da campanha, e a peça fora de `/ofertas`. Se a marcação ficar, é bug |
| duplo clique | dois cliques em "Aplicar" | um lote só, sem erro |
| filtro sem resultado | filtra por "Natal · 10 %" | lista vazia com mensagem, sem quebrar |
| celular | o filtro e a edição em massa em 390 × 844 | sem rolagem lateral |
