# CH-08 · CFR — a montagem e o pedido montado no celular

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-03 Adri com a fonte grande                                                |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento: 35 ações                                                  |
| Mudança      | as telas novas do app: a visão Montados, a montagem (barra fixa, indicador, 4 passos), as folhas (colar texto, variação, sair, cancelar, renovar, observação) e o pedido montado (UC-01, UC-02, UC-05, UC-06, UC-08, UC-09; D-08) |
| Viewport     | 390 × 844 a 100 %, 130 % e 200 % de fonte; 320 × 568 de contraprova           |
| Entrada      | `/pedidos` · logada como `admin-atelie`                                       |
| Jornadas     | J-01, J-04                                                                    |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003, TC-CFR-004, TC-PERSONA-002                |

## Missão

Refazer a montagem de uma cliente nova (J-01) e o reenvio do link (J-04) como auditoria: nada rola de lado,
nada fica atrás da barra fixa ou do teclado, todo alvo tem 44 px, cada espera diz que está trabalhando, e a
rede que cai não leva o que a Adri digitou.

## Deve tentar

1. Em 390 a 100/130/200 % (fonte da raiz aumentada no browser): `scrollWidth` do `body` = largura da viewport em cada passo e em cada folha; o chip "Montados · N abertos"; o cartão escuro do link
2. Medir a altura dos alvos: "x", indicador de passos, chips de variação, lixeira, "Editar", interruptores, "Copiar link"
3. Pelo teclado e pela árvore de acessibilidade: ordem de foco nas folhas, Esc/voltar fecha, o motivo do botão desligado anunciado (`aria-describedby`), toasts em região viva, a marca "Lido do texto — confira." associada ao campo
4. Cortar a rede em "Criar link", "Ler o texto", no resumo vivo e em "Copiar link"

## Edge cases sugeridos

- `reducedMotion: reduce` nas folhas e no indicador
- Campo focado com o teclado aberto (viewport encurtada para ~500 px de altura) e a barra fixa
- 320 × 568
- Nome de cliente e de joia longos

## Fora do escopo

- Elementos que o WI não tocou na mesma tela (cabeçalho do app, barra de abas em `/pedidos`) — `pré-existente`, ao log sem achado
- O painel (só a TC-REG-002 no CH-07)
- Leitor de tela real (TalkBack) e a fonte do sistema num Android real — Fora da cobertura
- Tema escuro: o app não tem

## CFR

**Jornadas:** J-01, J-04 — a montagem é a maior superfície nova; o pedido montado é o que a Adri reabre mais vezes.

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim       | inclui o tom memorial (sem `!`, emoji, urgência — D-08) |
| Acessibilidade        | sim       |                                            |
| Performance percebida | sim       |                                            |
| Compatibilidade       | sim       | só 390 (100/130/200 %) e 320 — o app é só celular; 1440 fica com o CH-07 |
| Recuperação de erro   | sim       |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada; registrar: Supabase local, functions servidas localmente, chave da IA e `PROPOSAL_TOKEN_KEY` presentes ou não |
