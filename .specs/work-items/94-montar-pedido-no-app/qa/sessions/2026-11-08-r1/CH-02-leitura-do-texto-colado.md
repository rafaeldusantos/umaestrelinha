# Sessão CH-02 · A leitura do texto colado da conversa

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-leitura-do-texto-colado.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie` (credencial local documentada, valor fora do log) |
| Tour · modo | Paste · com tour                                                       |
| Rodada      | exploração                                                             |
| Orçamento   | 46 ações de browser de 50                                              |
| Ambiente    | http://localhost:8084 (app do ateliê, branch feature/94) · painel http://localhost:8083 só para conferir a ficha · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 (painel em 1280 × 800) |
| Paridade    | Supabase local; `customer-parse` local com a Claude API real; "fora do ar" simulado por rota abortada e "limite" por 429 sintético (`{"error":"rate_limited"}`) interceptados no browser; `*.supabase.co` bloqueado; texto colado por `fill` (não por evento de colar do sistema); dados sintéticos |

## Missão

Achar qualquer texto colado do WhatsApp que faça a leitura preencher o campo errado sem a Adri perceber,
gravar algo antes de "Criar link", ou mexer na ficha de uma cliente que já existe — e confirmar que, com a
leitura fora do ar, a montagem segue à mão sem perder nada.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou, Pedidos › "Montar pedido", tocou em "Cliente nova" e digitou "Ju" no Nome | "Passo 1 de 4 · Cliente"; cartão "Tem os dados numa mensagem?" com "Colar texto da conversa" | — |
| 02 | "Colar texto da conversa" | Folha "Colar o texto da conversa" / "Eu leio e preencho os campos da cliente e da entrega. Você confere tudo antes de seguir."; "O texto não fica guardado."; 0/2000; "Ler o texto" desligado | — |
| 03 | Colou conversa em 5 mensagens com horário, "Oi Adri!! 😊", "+55 (51) 99999-1234", travessão, aspas curvas, "cep 90020008" (sem hífen), "CPF 123.456.789-09 ❤️", "ap 302"; tocou em "Ler o texto" | "Lendo o texto…"; folha fechou em ~3,3 s. Todos os 11 campos preenchidos e marcados ("Juliana Prates", e-mail, "(51) 99999-1234", "123.456.789-09", CEP "90020-008" com "Lido do texto — conferido no serviço de CEP.", Rua dos Andradas, 1234, ap 302, Centro Histórico, Porto Alegre, RS). Aviso "Preenchi 11 de 11 campos. Confira antes de seguir." / "Achei todos os campos. O CEP conferiu rua, bairro e cidade."; "Ler outro texto" e "Desfazer"; o cartão sumiu; nenhum emoji nem aspas nos campos | `screenshots/CH-02-03-leitura-cliente-nova.png` |
| 04 | Editou o WhatsApp lido e tocou em "Desfazer" | Ao editar, a marca do WhatsApp saiu (10 → 9 marcas "confira."). Desfazer: toast "Leitura desfeita." / "Os campos voltaram ao que estava antes."; Nome voltou a "Ju", os outros vazios, sem marca, cartão "Tem os dados numa mensagem?" de volta | `screenshots/CH-02-04-desfazer.png` |
| 05 | Digitou o e-mail à mão e leu texto com rua inventada ("Rua Inventada Sem Fim, 55 - Moinhos de Vento - Canoas/SC"), CEP 90020-008, CPF com dígito errado (…-10), telefone "51 999991234", sem e-mail | Rua "Rua dos Andradas", bairro "Centro Histórico", cidade "Porto Alegre", UF "RS" — do CEP, não do texto; número 55; CPF vazio; e-mail digitado preservado e sem marca. Aviso "Preenchi 8 de 11 campos…" / "Não achei: e-mail, CPF, complemento. O CEP conferiu rua, bairro e cidade." | `screenshots/CH-02-05-cep-manda.png` |
| 06 | "Desfazer", depois abriu a folha e colou 2.100 caracteres | Desfazer devolveu Nome "Ju" e o e-mail digitado; o campo cortou em 2.000, contador "2000/2000" | — |
| 07 | Trocou o texto por "obrigada pela atenção, depois eu vejo" e leu | Folha aberta com "Não encontrei nome, contato nem endereço neste texto. Confira se colou a mensagem certa, ou preencha à mão."; "Cancelar" virou "Preencher à mão" | `screenshots/CH-02-06-sem-dados.png` |
| 08 | "Preencher à mão" | Folha fechou; "Ju" e o e-mail digitado intactos; nenhuma marca | — |
| 09 | Com a `customer-parse` abortada (fora do ar), colou um texto e deu duplo toque em "Ler o texto" | Uma só requisição; folha aberta com "A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde."; "Preencher à mão"; o texto colado continua na caixa | `screenshots/CH-02-07-fora-do-ar.png` |
| 10 | Com a `customer-parse` respondendo 429 (limite), tocou em "Ler o texto" de novo | A mesma frase de fora do ar, com "Preencher à mão" (ver Spec-gaps) | — |
| 11 | "Preencher à mão" | Nome "Ju" e e-mail digitado intactos | — |
| 12 | Com a leitura atrasada (rota segura 4 s), tocou em "Ler o texto" e, durante "Lendo o texto…", em "Cancelar" | A folha **não fechou** (continuou aberta após o toque). Quando a leitura voltou, a folha fechou sozinha e os campos foram preenchidos: "Ju" → "Paula Lima", e-mail digitado à mão → e-mail do texto, com marcas e aviso | — (A-1) |
| 13 | Reproduziu de estado limpo (Desfazer → "Ju" + e-mail à mão): atraso 6 s, "Cancelar" (botão habilitado, sem `disabled`/`aria-disabled`), depois Esc | Nem "Cancelar" nem Esc fecharam a folha; ao voltar a leitura, Nome "Paula Lima" e o e-mail lido substituíram o que ela tinha digitado | `screenshots/CH-02-09-cancelar-ignorado.png` |
| 14 | Trocou para "Cliente cadastrada" | A leitura e as marcas sumiram (0 marcas) | — |
| 15 | Escolheu "Sônia Teste QA" › "Outro endereço" › "Colar de uma mensagem"; colou texto com OUTRO nome (Mariana Souza), outro e-mail, outro telefone, CPF e um endereço (Rua dos Andradas 500 apto 12, 90020-008) | Folha "Colar o endereço" / "Eu leio só o endereço. Os dados da ficha dela não mudam."; só CEP, rua, número, complemento, bairro, cidade e UF preenchidos e marcados; "Preenchi 7 de 7 campos…"; cartão "Cliente" seguiu "Sônia Teste QA · sonia.ch08@exemplo.com · 2 pedidos"; nenhum campo de contato apareceu | `screenshots/CH-02-11-cadastrada-so-endereco.png` |
| 16 | Voltou a "Cliente nova" e colou dados vindos de planilha (tabulações, travessão "–", "+55 51 …", CEP sem hífen) da Juliana Prates Ch02 | 11 de 11 preenchidos e marcados, máscaras do app; "Continuar" ligado. (Os campos de antes da troca — leitura da Paula — tinham sido limpos ao trocar) | — |
| 17 | No painel (1280), buscou "juliana.prates" em Clientes antes de criar o link | Nenhuma ficha encontrada | — |
| 18 | Continuar › acrescentou "Anel Afetivo com Leite materno gota cravejado · Folheado a ouro · 17" › Continuar (sem cupom) › Continuar | Revisar com a cliente lida ("Ficha nova · criada com o link"), entrega "Rua dos Andradas, 1234, ap 302 — Centro Histórico, Porto Alegre/RS · 90020-008", "Nada é gravado antes de você criar o link." | — |
| 19 | "Criar link" | Pedido montado P-0034 com "Link criado.", link, "Enviar pelo WhatsApp", ficha com CPF e endereço | `screenshots/CH-02-15-link-criado.png` |
| 20 | No painel, buscou "juliana.prates" de novo | "Juliana Prates Ch02 · juliana.prates.ch02@exemplo.invalid · conta · Nunca comprou" — a ficha só existe depois do link | — |

**Edge cases tentados:** emoji, "Oi Adri!!", mensagens separadas com horário, +55, CEP sem hífen, CPF com pontos, aspas curvas e travessão (03); colar de planilha com tabulações (16); CEP real com rua/bairro/cidade/UF errados (05); CPF com dígito errado (05); texto de 2.100 caracteres (06); texto sem dados (07); duplo toque em "Ler o texto" (09); leitura fora do ar (09) e limite 429 (10); fechar a folha durante "Lendo o texto…" — por "Cancelar" e por Esc (12, 13); "Desfazer" depois de editar um campo lido (04) e preservando valores digitados antes da leitura (04, 06); leitura em Cliente nova seguida de troca para cadastrada (14).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | pass | 01–03, 16–20 | `screenshots/CH-02-03-leitura-cliente-nova.png`, `screenshots/CH-02-15-link-criado.png` | Passos 1–4 e 6 conferidos; passo 5 (cupom) e 6b/7 (voltar, WhatsApp) não feitos nesta sessão (cobertos por CH-01/CH-06) — ver Fora da cobertura |
| TC-FUNC-011 | pass | 02, 03, 05, 06, 17 | `screenshots/CH-02-03-leitura-cliente-nova.png`, `screenshots/CH-02-05-cep-manda.png` | Variações "o CEP manda", 2.100 caracteres, emoji/aspas, +55/CPF com pontos e CPF com dígito errado: todas conforme. No texto com "ap 302" o complemento foi achado (aviso "Achei todos os campos") |
| TC-FUNC-012 | pass | 04, 06 | `screenshots/CH-02-04-desfazer.png` | "Ler outro texto" não clicado nesta sessão; leituras seguintes abriram a folha vazia pelo cartão |
| TC-FUNC-013 | pass | 15 | `screenshots/CH-02-11-cadastrada-so-endereco.png` | Passos 1–3; passo 4 (criar o link para a Sônia e reabrir a ficha no painel) não feito — orçamento |
| TC-FUNC-014 | pass | 07, 08 | `screenshots/CH-02-06-sem-dados.png` | — |
| TC-FUNC-015 | pass | 09–11, 16–19 | `screenshots/CH-02-07-fora-do-ar.png` | Fora do ar e 429 simulados no browser; duplo toque = 1 requisição. Passo 3 (seguir até "Criar link") provado por 16–19 depois da leitura voltar, não com a leitura ainda fora do ar |

Contagem: pass 6 · fail 0 · blocked 0 · skip 0

## Achados

### A-1 · [Folha "Colar texto"] "Cancelar" e Esc não fecham a folha durante "Lendo o texto…", e a leitura que chega depois substitui o que a Adri tinha digitado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no WhatsApp                                               |
| Jornada e passo     | J-01, passo 2 (colar e ler) · passos 12–13 do log                     |
| TC                  | — (edge case do charter: "fechar a folha durante 'Lendo o texto…'")   |
| Gravidade proposta  | medium — a Adri pede para desistir da leitura, o botão parece responder (habilitado) mas nada acontece, e segundos depois o nome e o e-mail que ela já tinha digitado são trocados pelo que veio do texto; recuperável por "Desfazer", mas só se ela notar. Numa jornada P0 a triagem pode subir para high (fricção em P0 / dano à confiança) |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, http://localhost:8084/pedidos › "Montar pedido" › "Cliente nova"
2. Digitar "Ju" em Nome e "ju.manual@exemplo.invalid" em E-mail
3. "Colar texto da conversa", colar "Sou a Paula Lima, paula.lima@exemplo.invalid, zap 51 98765-4321, Rua dos Andradas 100, cep 90020-008" e tocar em "Ler o texto" (rede lenta: na sessão, a resposta da `customer-parse` foi segurada 4–6 s no browser)
4. Enquanto aparece "Lendo o texto…", tocar em "Cancelar" (e depois Esc)
5. Esperar a resposta

**Esperado:** "Cancelar" fecha a folha e a leitura em curso é abandonada — os campos ficam como ela deixou ("Ju", e-mail digitado). Ou, se cancelar durante a leitura não é permitido, o botão aparece desligado. — **fonte:** PRD › Ler os dados de uma mensagem (a folha tem "Cancelar"; "nada do que você já fez se perde"); edge case do charter CH-02. O comportamento exato durante a leitura não está escrito (ver Spec-gaps).

**Observado:** "Cancelar" está habilitado (sem `disabled` nem `aria-disabled`), o toque não fecha a folha, Esc também não. Quando a leitura volta, a folha fecha sozinha, Nome vira "Paula Lima" e o e-mail digitado à mão vira "paula.lima@exemplo.invalid", com as marcas "Lido do texto — confira." e o aviso de leitura.

**Evidência:**

- `screenshots/CH-02-09-cancelar-ignorado.png` — os campos preenchidos pela leitura que ela tentou cancelar
- console: nada relevante
- rede: `POST /functions/v1/customer-parse → 200` (após o atraso injetado)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com 429 (limite), a folha diz "A leitura está fora do ar agora…" — a mesma frase de fora do ar; a Adri entende que está quebrado, não que deve esperar. A TC aceita "esperar ou preencher à mão" e o texto não tem fonte (D-11). Observado com 429 sintético (`{"error":"rate_limited"}`); o corpo real do 429 da function não foi provocado | 10 | polimento |
| Campos que vêm do serviço de CEP (rua, bairro, cidade, UF) levam a marca "Lido do texto — confira." mesmo quando o valor não estava no texto (texto dizia "Rua Inventada Sem Fim … Canoas/SC", o campo mostra "Rua dos Andradas … Porto Alegre/RS"). O aviso geral diz "O CEP conferiu rua, bairro e cidade", mas a marca no campo atribui ao texto | 05 | polimento |
| Ao digitar à mão um campo antes da leitura e o texto trazer o mesmo campo, a leitura sobrescreve o digitado (com marca, desfazível); quando o texto não traz o campo, o digitado fica e entra em "Não achei" mesmo preenchido ("Não achei: e-mail" com o e-mail digitado na tela). Nenhuma fonte define a precedência digitado × lido | 05, 12 | polimento |
| Comportamento de "Cancelar"/Esc durante "Lendo o texto…" não está escrito (ver A-1) | 12 | mudança |

## Fora da cobertura

- TC-JOURNEY-001 passo 5 (cupom), 6b (voltar do pedido montado) e 7 ("Enviar pelo WhatsApp" → `wa.me`) — orçamento; cobertos por CH-01/CH-06
- TC-FUNC-013 passo 4 (criar o link para a Sônia e reabrir a ficha no painel) — orçamento; o cartão "Cliente" inalterado foi conferido
- TC-FUNC-012 "Ler outro texto" clicado de fato, e a variação "o serviço de CEP completa depois" (não tira a marca) — não isolada
- Limite real de 30 leituras em 10 min — não provocado (simulado por 429 sintético); a frase real do limite pode diferir
- Cair a rede de verdade (`setOffline`) durante a leitura e voltar — substituído por rota abortada; o retorno da rede não foi exercido
- Evento de colar do sistema (clipboard/teclado virtual do Android) — o texto entrou por `fill`; o corte a 2.000 pelo colar real não foi provado
- "Lendo o texto…" acima de 10 s com a Claude API real lenta — não observado (leituras reais de ~3 s)

## Debrief

- **Surpresas:** a leitura real foi robusta a todos os textos da massa (emoji, aspas, tabulação, +55, CEP sem hífen) e respeitou o escopo "só endereço" da cadastrada mesmo com nome/e-mail/CPF de outra pessoa no texto. O único furo foi o cancelamento durante a leitura (A-1)
- **Próximo charter:** observações fora do escopo deste charter, para quem cobre o passo 1 e o pedido montado: a opção "Endereço salvo" da Sônia aparece sem texto do endereço e o "Endereço padrão" mostra o CEP sem hífen ("90010000"); no passo 2 a barra mostrou "Itens · 1 peça · frete à parte" com "—" no lugar do valor logo após acrescentar; "Peça acrescentada." continua no topo dos passos 3 e 4; no pedido montado o telefone aparece cru ("51999991234")
- **Padrão novo:** segurar a resposta da function no browser e tentar fechar a folha no meio — "cancelar uma operação assíncrona e esperar a resposta tardia" — achou A-1; candidato a tour para toda folha com chamada remota
