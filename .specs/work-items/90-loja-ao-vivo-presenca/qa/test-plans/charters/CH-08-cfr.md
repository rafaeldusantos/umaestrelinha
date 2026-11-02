# CH-08 · CFR — saber se tem alguém na loja e entender o que fazem

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | cfr |
| Prioridade   | P1 |
| Persona      | PER-02 Adri à noite, fonte 200 % |
| Tour         | — |
| Modo         | — |
| Time-box     | 45 min · orçamento 35 ações |
| Mudança      | o cartão "Agora na loja" e os blocos A–E e Acessos da Loja ao vivo (LAV-01, LAV-02, LAV-62, LAV-63, LAV-64, §9) |
| Viewport     | 390 × 844 a 100 %, 130 % e 200 % de fonte; 1440 uma vez |
| Entrada      | http://localhost:8084/ como `admin-atelie`, com 3 clientes presentes em estados diferentes (como no CH-01) |
| Jornadas     | J-01, J-02 |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003, TC-CFR-004 |

**Fonte grande:** emular a fonte do sistema escalando a fonte raiz do documento (130 % e 200 %), como as provas
das features 73 e 83. Movimento reduzido: `reducedMotion: reduce`.

## Missão

Refazer J-01 e J-02 como a Adri cansada, com a fonte no máximo e a tela lida em voz alta, procurando número
sobreposto, rolagem de lado, nome que não se entende e animação que não respeita "reduzir movimento".

## Deve tentar

1. As duas jornadas a 130 % e 200 %, medindo rolagem horizontal do body e sobreposição
2. A árvore de acessibilidade do cartão e da Loja ao vivo
3. Reduzir movimento e trocar a cliente de estado (as barras mudam de largura)
4. Ler cada texto de cada estado procurando exclamação, emoji ou urgência

## Edge cases sugeridos

- 320 × 568
- Tema escuro do sistema
- Só teclado
- Movimento reduzido

## Fora do escopo

- Elementos que o Work Item não tocou no Início e na Loja ao vivo (faixa de movimento, gráfico de Acessos da Fase 1) — o que aparecer ali é pré-existente
- Leitor de tela real e o Android real — fora do browser da sessão

## CFR

**Jornadas:** J-01, J-02 — o cartão e os blocos A–E são a maior superfície da mudança.

| Categoria             | Na rodada | Por quê, se fora |
| --------------------- | --------- | ---------------- |
| Usabilidade           | sim       |                  |
| Acessibilidade        | sim       |                  |
| Performance percebida | sim       |                  |
| Compatibilidade       | sim       |                  |
| Recuperação de erro   | não       | coberta pelo CH-06 (Network), na mesma superfície |
| Paridade com produção | sim       | sempre — é a condição da rodada; registrar: build de dev, banco local, `production_host` semeado como `localhost`, só Chromium |
