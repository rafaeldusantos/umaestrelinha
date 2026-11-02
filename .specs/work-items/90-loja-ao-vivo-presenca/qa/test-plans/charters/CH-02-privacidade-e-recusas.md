# CH-02 · Quem recusou não aparece em número nenhum

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-04 Helena |
| Tour         | Multi-Tab |
| Modo         | com tour |
| Time-box     | 60 min · orçamento 50 ações |
| Mudança      | a loja avisa que a pessoa está na loja só com o mesmo consentimento e as mesmas recusas do contador de visitas — estatística, robô, host interno, `?nao-contar` (§6.2, §10.3); a recusa de cookies esquece o código da presença; a Política de Privacidade ganha o texto do §7 (R-02) |
| Viewport     | 390 × 844 |
| Entrada      | loja: http://localhost:8082/ num navegador novo, sem escolha de cookies · oráculo: o app em http://localhost:8084/ao-vivo logado como `admin-atelie`, num contexto separado (só para ler os números) |
| Jornadas     | J-04 |
| TC           | TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-004, TC-FUNC-017 |

**Ambiente:** o mesmo do CH-01 (`production_host` = `localhost` no banco local, function `visit` servida,
`webdriver` neutralizado e UA de iPhone no contexto da loja, `*.supabase.co` e `**/g/collect*` bloqueados).
Para TC-SEC-004, um segundo contexto **sem** a neutralização (robô) e a loja aberta por
`http://127.0.0.1:8082` (endereço que não é o de produção semeado). Anote os números da Loja ao vivo antes de
cada passo; o atraso de até 75 s vale para "não mudou" também.

## Missão

Achar qualquer caminho em que uma cliente que recusou estatística, abriu um link de "não contar", ou não é a
loja de produção apareça em "Agora na loja" — principalmente com duas abas abertas.

## Deve tentar

1. Recusar "Estatísticas" na primeira visita e navegar joia → sacola → checkout; os números não mudam
2. Aceitar, abrir duas abas, recusar numa — a outra, já aberta, tem de parar de contar
3. `?nao-contar=1` numa aba e seguir navegando na outra; depois `?nao-contar=0`
4. Ler a Política de Privacidade inteira na parte de medição e conferir cada ponto do §7

## Edge cases sugeridos

- Recusar e reaceitar no mesmo dia
- Recusar com a aba da joia em segundo plano e voltar a ela
- Abrir a URL da joia em aba nova depois da recusa
- Armazenamento do navegador bloqueado (aba privada) — a loja segue funcionando e não conta
- Robô (Playwright sem neutralização) navegando pela loja
- Loja aberta por `127.0.0.1` em vez de `localhost`

## Fora do escopo

- O GA4 e o aviso de cookies em si (feature 61) — fora a categoria "Estatísticas" estar presente
- O resto da Política (trocas, cuidados com a joia) — a mudança só reescreve o parágrafo de medição
- Conferir o banco por dentro: o que a persona vê é o número do app e o texto da Política
- A aprovação da Adri do texto — é pré-condição da publicação, não deste QA
