# WI 102 · Campanhas de desconto — decisões de produto da QA

| ID | Rodada | Pergunta | Resposta | Destino | Data | Quem decidiu |
| -- | ------ | -------- | -------- | ------- | ---- | ------------ |
| P-01 | 1 (exploração) | A campanha acaba com o checkout aberto: o total sobe (R$ 695,55 → R$ 767,16) e só o resumo e o botão "Pagar" mudam, sem mensagem (R-02 / UC-05, CH-06, TC-FUNC-017). Basta? | Basta como está: o novo total exibido antes de pagar é a nova confirmação que o UC-05 pede, e ninguém paga um valor que não viu. A mensagem explicando que a campanha terminou é melhoria | nada neste WI; a mensagem explicativa vai a **WI novo** (sugestão de backlog: "Avisar no checkout que a campanha terminou e por que o total mudou") | 2026-11-13 | a thread, pela recomendação do QA, sob delegação explícita do humano ("Todos os gates ou questões que precisar de respostas do humano, use suas sugestões… sem a necessidade de intervenção do humano"); a página foi aberta e fechada sem resposta |
