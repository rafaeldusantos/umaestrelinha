# Decisões de produto — QA do WI 103

## Premissas do plano (rodada 3, 2026-11-17)

Respondidas pela sugestão, a pedido do humano ("Responda as perguntas com suas sugestões"). A página de premissas expirou duas vezes sem resposta antes disso. Todas foram mantidas. Nenhuma virou bug.

| id | premissa | resposta | destino |
| --- | --- | --- | --- |
| P-01 | Bloco "aparece sozinho" no início da campanha (CA-02.2): basta recarregar a Home, sem ação da dona | Mantida | nenhum (QA aprovado) |
| P-02 | Teto de 12 peças (CA-03.3): a busca recusa a 13ª com motivo e a recusa ao salvar é a rede de baixo | Mantida, com o risco de TC-FUNC-007 não ter rodado | `qa/backlog.md` (cobertura pendente do TC-FUNC-007) |
| P-03 | Título acima de 60 (CA-01.6): recusa sem aparar | Mantida; vista na rodada 3 com 61 caracteres | `qa/backlog.md` (CA-01.6 sem o caso completo) |
| P-04 | Linha do bloco e avisos conferidos pelo sentido, não pela frase literal (CA-02.3) | Mantida | nenhum |
| P-05 | "A vaga fica vazia" (CA-04.2): sem cartão em branco, nenhuma peça não escolhida ocupa o lugar | Mantida | nenhum |
| P-06 | Peça tirada da campanha não é contada na linha do bloco; é conferida na loja e no editor | Mantida | nenhum |
| P-07 | Relógio do painel × relógio do banco: 1 minuto de folga na virada | Mantida | nenhum |
| P-08 | Prévia do painel usa a sessão que o navegador tem na loja (CA-06.1) | Mantida | nenhum |
| P-09 | Conferência visual só pelos padrões adotados, sem as telas do escopo no protótipo (D-01); contador `n/limite` é desvio declarado (I-06) | Mantida | nenhum |
| P-10 | "A campanha baixa o preço" medido contra o "por" da peça (WI 102 I-02, D-06) | Mantida | nenhum |
