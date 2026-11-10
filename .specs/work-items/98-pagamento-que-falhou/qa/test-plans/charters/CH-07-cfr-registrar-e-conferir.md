# CH-07 · CFR — registrar e conferir/desfazer no painel

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri no celular                                                        |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento: 35 ações                                                  |
| Mudança      | A tela "Registrar pagamento" e o bloco Pagamento (registro, comprovantes, desfazer, selos, link de cartão) — RNF-04, CA-03.10, CA-03.11, CA-04.1 |
| Viewport     | 390 × 844 primeiro; 1440; fonte a 130 % e 200 % em 390                       |
| Entrada      | `http://localhost:8083/admin/pedidos/:id` · logada como `admin`; massa M6 (para registrar) e M7 (para conferir e desfazer) |
| Jornadas     | J-01, J-02                                                                    |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003                                            |

## Missão

Refazer o registro e o desfazer como auditoria das qualidades transversais — retorno, recuperação de
erro, teclado e nomes, fonte grande e largura — só nas superfícies que o Work Item criou ou mudou.

## Deve tentar

1. J-01 em 390 com a fonte a 200 %: a tela, o portão e a volta ao pedido; depois em 1440
2. J-01 só pelo teclado (Tab, Enter, Esc) em 1440, lendo o snapshot: rótulos dos campos, nome do campo de arquivo, anúncio das recusas
3. J-02: o desfazer pelo teclado, o foco depois de confirmar, e a falha de rede no confirmar
4. Com `reducedMotion: reduce`, a tela e o bloco

## Fora do escopo

- As telas da cliente (cobertas em TC-UI-002 e TC-FUNC-027, no CH-04)
- Elementos da página do pedido que a mudança não tocou (itens, endereço, rastreio, material): o que se notar ali é `pré-existente`, vai ao log sem achado
- Leitor de tela real (VoiceOver/TalkBack), outros browsers além do engine do driver, celular real

## CFR

**Jornadas:** J-01, J-02 — a tela nova e o bloco são a maior superfície da mudança, e é onde a dona grava dinheiro e prova.

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim       |                                            |
| Acessibilidade        | sim       |                                            |
| Performance percebida | sim       | só retorno do botão e espera do envio dos comprovantes |
| Compatibilidade       | sim       |                                            |
| Recuperação de erro   | sim       |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada (desvios a registrar: edge functions locais com chaves externas inválidas; `pnpm dev`, não o build) |
