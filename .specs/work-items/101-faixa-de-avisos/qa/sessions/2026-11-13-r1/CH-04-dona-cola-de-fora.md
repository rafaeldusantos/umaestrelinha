# Sessão CH-04 · A dona cola texto e endereço de outros lugares

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-04-dona-cola-de-fora.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*` |
| Tour · modo | Paste · por técnica (valor limite) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 (mais 5 de limpeza: recarregar para descartar, sair da conta, fechar) |
| Ambiente    | http://localhost:8083/admin/faixa-de-avisos · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 |
| Paridade    | Supabase local; rotas `*.supabase.co` e `**/g/collect*` abortadas. Colagem: a área de transferência do browser headless recusou escrita (`NotAllowedError: Write permission denied`), então a colagem foi feita com `keyboard inserttext` (insere o texto sem eventos de tecla, como uma colagem) depois de esvaziar o campo |

## Missão

Achar qualquer jeito de um texto ou endereço colado de fora (Instagram, barra do navegador, planilha) passar pelo painel e virar um aviso cortado, um link para fora da loja ou um "Ver ofertas" que não leva a nada — e conferir que cada recusa diz à Adri o que corrigir.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Entrou no painel como `admin-loja` e abriu Faixa de avisos | Faixa ligada, 4 avisos do manifesto ("4 de 5"), Salvar alterações desabilitado | — |
| 02 | Abriu o A1 e colou `https://umaestrelinha.com.br/ofertas` no Destino sem apagar o que havia (Cmd+A não selecionou o campo; o texto colou no fim) | Destino ficou `/joias-afetivashttps://umaestrelinha.com.br/ofertas`. Recusa: "1º aviso: Este endereço não existe na loja: coleção tem no máximo dois níveis." A linha-resumo do aviso passou a mostrar o endereço emendado | — |
| 03 | Esvaziou o Destino do A1 e colou `https://umaestrelinha.com.br/ofertas` | Recusa no campo: "1º aviso: O endereço precisa começar com “/”: a loja só aponta para páginas dela."; a barra: "Corrija o que está marcado para salvar."; Salvar desabilitado | `screenshots/CH-04-03-https-recusado.png` |
| 04 | Colou `//exemplo.com` no Destino do A1 | "1º aviso: Este endereço leva para fora da loja. Use um caminho da loja, começando com uma só “/” — por exemplo, “/ofertas”."; Salvar desabilitado — texto igual ao do TC | `screenshots/CH-04-04-duas-barras.png` |
| 05 | Colou `/\exemplo.com` | A mesma recusa de "leva para fora da loja"; Salvar desabilitado | — |
| 06 | Colou ` /joias-afetivas ` (espaço no começo e no fim) | Sem recusa; a linha-resumo mostra `Texto · /joias-afetivas` (aparado); o campo mantém os espaços; Salvar alterações **habilitado** (o rascunho conta como mudado). Não salvo — não há como conferir pela tela, sem salvar, se grava aparado | — |
| 07 | Devolveu o Destino do A1 para `/joias-afetivas` | Recusas somem; Salvar volta a ficar desabilitado (sem mudança) | — |
| 08 | Abriu o A4 (imagem) e colou `https://umaestrelinha.com.br/ofertas` no Destino | "4º aviso: O endereço precisa começar com “/”: a loja só aponta para páginas dela."; "Corrija o que está marcado para salvar."; Salvar desabilitado | — |
| 09 | Abriu o A3 (sem link) e escreveu o rótulo `Como funciona`, sem destino | "3º aviso: Sem destino, o rótulo do link não aparece."; a recusa do A4 segue listada; Salvar desabilitado | `screenshots/CH-04-08-rotulo-sem-destino.png` |
| 10 | Abriu o A2 | Contadores 26 · 52 · 12 (90 no total). Orçamento esgotado aqui | — |
| 11 | Recarregou a tela para descartar o rascunho | Os 4 avisos do manifesto voltaram como estavam; Salvar desabilitado. Nada foi gravado | — |

**Edge cases tentados:** URL completa colada no Destino (aviso de texto e de imagem); duas barras `//`; barra invertida `/\`; espaço no começo e no fim do caminho; colagem emendada no valor existente (improvisado: o Cmd+A não selecionou); rótulo sem destino.

## Casos

| TC          | Veredito | Passo        | Evidência | Nota |
| ----------- | -------- | ------------ | --------- | ---- |
| TC-FUNC-003 | pass     | 03–08        | `screenshots/CH-04-03-https-recusado.png`, `screenshots/CH-04-04-duas-barras.png` | passos 1–3 e as três variações conforme; na variação do espaço, aceito (resumo aparado) — gravação não conferida porque a sessão não salva |
| TC-FUNC-004 | skip     | 09           | `screenshots/CH-04-08-rotulo-sem-destino.png` | orçamento: só o passo 1 rodou, e conforme (recusa com o texto exato, Salvar desabilitado). Passos 2–3 e variações (rótulo só com espaços, aviso vazio) não rodaram |
| TC-FUNC-008 | skip     | 10           | — | orçamento: só se viu o A2 com 26 · 52 · 12. Os passos 2–4 (91 caracteres, destaque de 41) e as variações (quebra de linha, emoji, rótulo de 21) não rodaram |

Contagem: pass 1 · fail 0 · blocked 0 · skip 2

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Endereço completo colado no fim de um caminho que já estava no campo (`/joias-afetivashttps://…`) é recusado, mas com "Este endereço não existe na loja: coleção tem no máximo dois níveis." — o motivo não diz à Adri que colou um endereço de fora | 02 | polimento |
| Caminho com espaço no começo e no fim é aceito, o resumo mostra aparado, mas o Salvar habilita como se houvesse mudança; nenhuma fonte diz se o campo deve aparar na hora | 06 | polimento |
| A dica "Sem destino, o aviso é só texto." aparece embaixo do Destino mesmo com destino preenchido (A1) | 02–04 | polimento |

## Fora da cobertura

- TC-FUNC-004 passos 2–3 e as variações (rótulo só com espaços, aviso vazio) — orçamento esgotado
- TC-FUNC-008 passos 2–4 e as variações (91 caracteres no total, destaque de 41, quebra de linha colada de planilha, emoji, rótulo de 21) — orçamento esgotado
- Edge cases do charter: aspas curvas e travessão, tabulação, URL `https://…` no destaque, emoji, aviso vazio — orçamento esgotado
- Colagem pela área de transferência real: o browser headless negou permissão de escrita; usou-se `keyboard inserttext`. Colagem com formatação (HTML de editor) não foi exercitada
- Se o caminho com espaços grava aparado — exige salvar, proibido nesta sessão

## Debrief

- **Surpresas:** Cmd+A no campo não selecionou o texto no Chromium headless, e a colagem emendou no valor — o painel recusou, mas com motivo de "dois níveis"
- **Próximo charter:** uma sessão curta (≈25 ações) só para TC-FUNC-008 e o resto de TC-FUNC-004, com os edge cases de texto (aspas curvas, quebra de linha, emoji, URL no destaque)
- **Padrão novo:** "colar sem apagar" — colar por cima de um valor existente quando a seleção falha, gerando um endereço emendado
