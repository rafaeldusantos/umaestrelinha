# CH-07 · CFR — a faixa na loja, pelo teclado, com fonte grande e rede lenta

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | cfr |
| Prioridade   | P1 |
| Persona      | PER-03 Marta |
| Tour         | — |
| Modo         | — |
| Time-box     | 45 min · orçamento: 35 ações |
| Mudança      | a faixa da loja: reserva de altura pelo atributo da página servida, região sem anúncio, setas e foco sobre o ouro, movimento reduzido, alturas em `rem` (RN-02, RN-04, RN-05, RN-07, CA-02, CA-06, CA-07) |
| Viewport     | 390 × 844 e 1440 × 900; raiz a 130 % e 200 % |
| Massa        | só lê a faixa do manifesto |
| Driver       | `cli` — interceptar o documento HTML e escrever `data-faixa` no `<html>`, como a função faz (Q-02, respondida: `page.route` + `route.fetch()` + `route.fulfill` pelo `run-code`), **e** limitar rede (Slow 4G) e CPU (4×) por CDP antes da carga, para medir o CLS — o `agent-browser` não limita rede nem CPU. Exige `@playwright/cli` instalado (não está nesta máquina; Ambiente da execução) |
| Entrada      | o build servido da loja (`vite preview`, Ambiente da execução) · sem sessão |
| Jornadas     | J-04, J-02 |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003, TC-CFR-004 |

## Missão

Refazer a leitura dos avisos como a Marta (teclado, fonte grande, movimento reduzido) e a chegada da Bia em rede lenta, auditando se a faixa pula, anuncia, some do foco ou corta o link.

## Deve tentar

1. Medir o CLS da Home e de um produto com o documento marcado `"0"` e `"1"`, em rede lenta.
2. Percorrer a faixa só com Tab e ler a árvore de acessibilidade.
3. Repetir com movimento reduzido e com a raiz a 200 % — a 200 % a faixa pode passar de duas linhas (Q-01); o que se procura é corte, sobreposição, link inalcançável e rolagem lateral.

## Edge cases sugeridos

- Movimento reduzido
- Só teclado
- Zoom do navegador a 200 % em 1440
- Tema escuro do sistema (a faixa segue os tokens)

## Fora do escopo

- Leitor de tela real (VoiceOver, TalkBack): fora do browser da sessão
- Contraste no segundo perfil de estilo (WI 100 não existe)
- O cache e a Home servida pela Vercel
- Acessibilidade e performance do resto da página (cabeçalho, produto): pré-existentes — vão ao log sem achado
- O painel

## CFR

**Jornadas:** J-04, J-02 — a leitura dos avisos sem mouse e a chegada pelo celular em rede lenta são a maior superfície da mudança

| Categoria             | Na rodada | Por quê, se fora |
| --------------------- | --------- | ---------------- |
| Usabilidade           | sim       | (só a faixa: o tempo para ler antes de trocar) |
| Acessibilidade        | sim       | |
| Performance percebida | sim       | |
| Compatibilidade       | sim       | só o engine do driver; Safari iOS e Chrome Android ficam fora |
| Recuperação de erro   | não       | a faixa não tem caminho de erro visível à cliente: leitura que falha é o estado "sem atributo" (coberto em TC-FUNC-010) |
| Paridade com produção | sim       | build servido, não dev; a função `api/page` substituída pela marcação do documento (Q-02, respondida) — registrar no cabeçalho do log |
