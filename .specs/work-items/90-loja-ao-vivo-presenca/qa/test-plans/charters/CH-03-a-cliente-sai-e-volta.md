# CH-03 · A cliente sai, volta, e a loja não engasga

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-03 Lúcia |
| Tour         | Interrupt |
| Modo         | por cenário (J-05) |
| Time-box     | 60 min · orçamento 50 ações |
| Mudança      | a loja só avisa com a aba visível, a cada 60 s, na troca de rota e na mudança da sacola (§6.2); pessoa na loja = aviso nos últimos 5 min (LAV-12, §10.4); sacola guardada de visita anterior conta "Com joia na sacola" (LAV-20) |
| Viewport     | 390 × 844, rede lenta (Slow 4G) na loja |
| Entrada      | loja: http://localhost:8082/produtos/<slug>?utm_source=instagram, estatística aceita, sacola vazia · oráculo: o app em http://localhost:8084/ao-vivo como `admin-atelie`, noutro contexto |
| Jornadas     | J-05, J-02a |
| TC           | TC-JOURNEY-002, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-REG-003 |

**Ambiente:** o mesmo do CH-01. Para "aba em segundo plano", abra outra aba no mesmo contexto da loja e traga-a
para a frente (a da loja fica oculta). As esperas de 5 min são parte da missão; use-as para olhar a loja em
outra aba do oráculo, sem gastar ações à toa.

## Missão

Confirmar que a Lúcia pode sair e voltar à loja quando quiser — a sacola de antes continua lá, o checkout não
engasga — e que a Adri a vê sair do total em até 5 min e voltar com o estado certo.

## Deve tentar

1. Pôr joia na sacola, fechar a aba, cronometrar até ela sair do total
2. Deixar a aba em segundo plano 6 min e voltar; ela sai e reaparece
3. Reabrir a loja num contexto com a sacola guardada; ela conta "Com joia na sacola" sem tocar em nada
4. Mudar a sacola várias vezes no checkout (quantidade, remover, voltar) com rede lenta e preencher os dados

## Edge cases sugeridos

- Fechar a aba no meio do checkout
- Esvaziar a sacola e seguir olhando
- Duas abas da mesma loja no mesmo navegador
- Recarregar durante a troca de rota
- Girar o celular (390 × 844 → 844 × 390) com a sacola aberta
- Ficar offline 1 min na loja e voltar

## Fora do escopo

- O pagamento (PIX/cartão) — o `mercado-pago` local não sobe
- Carrinhos abandonados no painel — a mudança só cita o nome na nota
- A seção Acessos (CH-05)
- O cálculo de frete e o resto do checkout que a mudança não toca: o que aparecer ali é sugestão de backlog
