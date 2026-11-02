# CH-01 · O número da loja e o funil batem com o que a cliente faz

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-01 Adri |
| Tour         | Feature |
| Modo         | por cenário (J-01 e J-02, passos 4–6) |
| Time-box     | 90 min · orçamento 70 ações |
| Mudança      | o cartão "Agora na loja" no Início substitui o "Visitas hoje" (LAV-01, LAV-02, LAV-05); o bloco A da Loja ao vivo (LAV-10, LAV-11, LAV-12); o bloco B "O que estão fazendo" com o funil exclusivo, a nota do checkout e "Compraram" (LAV-20, LAV-21, LAV-22, §10.2); a nota "Conta só quem aceitou cookies de estatística." (R-01); o aviso de presença que a loja manda (§6.2) |
| Viewport     | 390 × 844 (app e loja) |
| Entrada      | app: http://localhost:8084/ logada como `admin-atelie`; loja: http://localhost:8082/ num **segundo contexto** do browser, cookies de estatística aceitos |
| Jornadas     | J-01, J-02 |
| TC           | TC-SMOKE-001, TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-FUNC-008 |

**Ambiente (antes da primeira ação):**

- `store_settings.analytics.production_host` = `localhost` no banco **local** (como faz o probe
  `.specs/work-items/90-loja-ao-vivo-presenca/probes/02-function-ping.sh`), e restaurado no fim da sessão
- function `visit` servida por `supabase functions serve`
- no contexto da loja: `navigator.webdriver` neutralizado e user agent sem `HeadlessChrome` (um UA de iPhone),
  senão a loja recusa o navegador como robô e nada aparece; bloquear `*.supabase.co` e `**/g/collect*`
- massa: um pedido aprovado (pago) no banco local nos últimos 30 min, para "Compraram"; um pedido montado com
  link (`/pedido-montado#<token>`) e um pedido pendente de PIX (`/pedido/:id/pagamento`)
- atraso esperado: até 60 s do aviso da loja + 15 s da leitura da tela (30 s no cartão do Início). Espere
  esse tempo antes de concluir que um número está errado

## Missão

Confirmar que, a cada coisa que a cliente faz na loja, a Adri vê no cartão do Início e na Loja ao vivo o mesmo
número de pessoas, e o funil dividindo essas pessoas sem contar ninguém duas vezes.

## Deve tentar

1. Uma cliente só: pousar numa joia, pôr na sacola, ir ao checkout — conferir a cada passo o cartão do Início,
   o número grande, a barra de agora e as três linhas do funil (soma = total)
2. Duas e três clientes ao mesmo tempo (contextos separados), em estados diferentes; conferir "1 pessoa" ×
   "2 pessoas", "2 com joias na sacola", e que a parte zerada some da linha do cartão
3. A cliente no pagamento de um pedido feito e num pedido montado (devem contar "No checkout") e em
   `/pedido/:id` (não deve)
4. A nota do checkout: aparece com alguém no checkout, some sem ninguém, e não cita prazo

## Edge cases sugeridos

- Recarregar a página da joia várias vezes (não deve virar mais de uma pessoa)
- Navegar rápido entre cinco páginas (troca de rota dispara aviso)
- Voltar pelo navegador do checkout para a sacola
- Abrir a Loja ao vivo pelo cartão e voltar ao Início pelo "Voltar" e pelo voltar do navegador
- Viewport mínima 320 × 568 no cartão do Início
- Ninguém na loja: "Ninguém na loja agora" no cartão, com o gráfico visível

## Fora do escopo

- A seção Acessos (CH-05) e os blocos C, D e E (CH-04)
- O resto do Início (faixa de movimento, "Precisa de você", joias da semana) — a mudança não toca
- O pagamento em si (PIX, cartão): o `mercado-pago` local não sobe; a sessão para no checkout preenchido
- Cidades (LAV-48) — fora do Work Item
- O texto do cartão "Visitas hoje" da Fase 1 — substituído (LAV-04)
