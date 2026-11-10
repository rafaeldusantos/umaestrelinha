# Sessão CH-01 · Registrar pagamento no celular, com comprovantes de verdade e maltratados

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-registrar-no-celular.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no celular · conta: `admin` — `QA_ADMIN_*`                  |
| Tour · modo | Garbage · por técnica (valor limite nos arquivos e na data)            |
| Rodada      | exploração                                                             |
| Orçamento   | 48 ações de browser de 50                                              |
| Ambiente    | painel `http://localhost:8083` · build não exposto (Vite dev) · Chromium headless (Playwright MCP) · viewports 390 × 844, 320 × 568, 1440 × 900 |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados; e-mail à cliente sai pelo Resend com chave inválida (não chega ao Mailpit); `close-charge` do Mercado Pago não fecha no local; arquivos anexados pela API de file chooser do Playwright (equivale à escolha no seletor do sistema, sem a câmera real) |

## Missão

Confirmar que a Adri, com uma mão no celular, registra o PIX que a cliente mandou por fora — com a foto
do comprovante — em menos de 90 s, e que nenhum arquivo, data ou toque duplo maltratado faz a tela gravar
pela metade, aceitar o que devia recusar ou repetir o efeito.

## Passos

Pedidos usados (todos da sobra M6 do manifesto): #0567 (jornada), #0571 (anexos e toque duplo), #0565 = M6b
(datas), #0570 (vazio, 320), #0572 (offline), #0569 (repetição do offline), #0568 (só a tela em 1440, sem
gravar); M9 #0561 e M12 #0558 só leitura.

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir o pedido #0567 (Pendente) em 390 e achar a ação | "Registrar pagamento" existe, 44 px de altura, sem rolagem lateral (`scrollWidth` 390) — mas no fim da página, a 2.403 px de 2.489 (três telas para baixo), depois de Itens, Histórico, Melhor Envio, Cliente, Entrega e Rastreio; no topo fica "Avançar mesmo assim" | — |
| 02 | Tocar em "Registrar pagamento" | Tela própria `/admin/pedidos/:id/pagamento`: os cinco meios em rádio, data 10/11/2026 e hora 02:42 de Brasília (05:42 UTC no relógio), observação 0/1000, "Comprovantes", e a frase do portão | — |
| 03 | Escolher "PIX direto" e escrever a observação; depois tocar em "Comprovantes" e escolher o JPG e o PDF de nome longo e acentuado | Nada aparece na lista de comprovantes; tentou de novo com um PNG — nada. Sem mensagem, sem erro no console | — |
| 04 | Confirmar mesmo assim | Abre o portão "Registrar o pagamento" com "Avisar a cliente por e-mail" marcado, o destinatário e "Ver o e-mail" | `screenshots/CH-01-06-portao.png` |
| 05 | Confirmar no portão, com o e-mail marcado | Volta ao pedido: "Pago", Situação "Aprovado", bloco "Registrado à mão" com PIX direto, "10/11/2026 às 02h42", "Registrado por admin@umaestrelinha.dev", a observação — **e nenhum comprovante**. Histórico: "Pendente → Pago · Pagamento registrado manualmente · 02:43:34" (sem quem registrou) e "Falha ao enviar o aviso: Pagamento aprovado (E-mail)" com "Reenviar" (Resend inválido no local) | `screenshots/CH-01-07-bloco-sem-comprovantes.png` |
| 06 | Voltar do navegador para a tela de registrar do #0567 já pago | "Este pedido já está pago." e "Voltar ao pedido"; sem formulário | — |
| 07 | Isolar o anexo no #0571: tela recém-aberta, escolher só o GIF; depois o JPG | O GIF aparece com "comprovante-qa98-recusado.gif não é JPG, PNG, WebP, HEIC ou PDF." (role alert); o JPG escolhido em seguida **não entra** | — |
| 08 | Tela recém-aberta, escolher só o JPG | JPG listado com "Tirar comprovante-qa98.jpg" | `screenshots/CH-01-09-primeira-escolha-listada.png` |
| 09 | Com o JPG listado, escolher o PNG; depois mexer na observação e escolher o WebP | Nenhum dos dois entra; a lista segue só com o JPG, sem mensagem | — |
| 10 | Pelo seletor (toque em "Comprovantes"), escolher o JPG e, num segundo toque, o PDF | O JPG entra; o PDF da segunda escolha é ignorado em silêncio — reproduzido | `screenshots/CH-01-12-segunda-escolha-ignorada.png` |
| 11 | Cada arquivo como **primeira** escolha numa tela recém-aberta: JPG+PDF juntos, PDF de nome acentuado, HEIC, 10 MB exato, 10 MB + 1 byte, quatro JPG de nome longo de uma vez | JPG+PDF: os dois listados · PDF acentuado: listado · HEIC: listado · 10 MB exato: listado · 10 MB + 1: "… passa de 10 MB." · quatro de uma vez: os quatro nomes e "São no máximo 3 comprovantes por pagamento." · `scrollWidth` 390 com os nomes longos | `screenshots/CH-01-11-quatro-de-uma-vez.png` |
| 12 | No #0571 (com o JPG da passo 10), escolher "Dinheiro" e dar toque duplo em "Registrar pagamento" e toque duplo no confirmar do portão | Um portão só; um registro ("Dinheiro", "Abrir comprovante 1 (JPG)") e uma linha "Pagamento registrado manualmente" no histórico | — |
| 13 | No #0565 (M6b, criado 02:30), pôr 23:59 de hoje | "A data do pagamento não pode estar no futuro." (alert, na hora), botão desabilitado | — |
| 14 | Pôr 02:00 (antes da criação) | "A data do pagamento não pode ser anterior à criação do pedido.", botão desabilitado; meio e observação seguem preenchidos | `screenshots/CH-01-15-data-anterior.png` |
| 15 | Pôr 02:30 e 02:31; depois "Limpar data" | 02:30 e 02:31 aceitos; ao limpar, o campo de data passa a dizer "Agora" e a hora continua mostrando 02:31 | — |
| 16 | Registrar o #0565 assim, com o e-mail desmarcado | Gravou "Pago em 10/11/2026 às 02h47" (a hora de agora, não os 02:31 que a tela mostrava). Histórico: "Aviso à cliente não enviado: Pagamento aprovado · Você escolheu não avisar" | — |
| 17 | Abrir o #0570 em 320 × 568 e medir; depois, em 390, confirmar sem preencher nada | `scrollWidth` 320; alvos: rádios (a linha) 44, hora 44, Comprovantes 44, Cancelar 44, Registrar 44, voltar 44 — **botão de data 40 e "Limpar data" 36**. Grava: "Meio não informado", data de agora, quem registrou | `screenshots/CH-01-17-320.png` |
| 18 | No #0572, anexar o JPG de 10 MB, confirmar com o e-mail desmarcado e cortar a rede 150 ms depois; restaurar após 4 s | O envio terminou antes do corte (local); aviso "Pagamento registrado · sem e-mail à cliente (anotado no histórico)". A chamada `send-notification?action=trigger` falhou (`ERR_INTERNET_DISCONNECTED`). Depois de voltar e recarregar: bloco com o comprovante, histórico **só** com "Pendente → Pago" — a linha "Aviso à cliente não enviado" não existe | `screenshots/CH-01-18-offline.png` |
| 19 | Repetir no #0569, cortando a rede só depois de o pedido abrir | O histórico tem "Aviso à cliente não enviado" — o corte chegou depois da chamada; a falha depende do instante | `screenshots/CH-01-19-controle-historico-com-aviso-pulado.png` |
| 20 | Abrir M9 (#0561, pago) e M12 (#0558, cancelado) e colar a URL `/pagamento` de cada um | Sem "Registrar pagamento" nos dois; pela URL: "Este pedido já está pago." e "Pedido cancelado não recebe registro de pagamento.", sem formulário | — |
| 21 | Tela de registrar do #0568 em 1440 × 900 (sem gravar) | `scrollWidth` 1440; observação com 622 px, botão com 170 px — sem campo esticado de ponta a ponta | `screenshots/CH-01-21-1440.png` |

**Edge cases tentados:** duplo clique no enviar e no portão (passo 12) · enviar vazio (17) · cair e voltar no envio (18–19 — o upload local de 10 MB terminou antes do corte; o que caiu foi a anotação do aviso) · voltar do navegador depois de gravar (06) · viewport mínima 320 × 568 (17) · arquivo com nome longo e acentuado (11) · valor limite de tamanho: 10 MB exato e 10 MB + 1 (11) · quatro de uma vez (11) · data no futuro, antes da criação, no minuto da criação e apagada (13–16)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | fail | 01–05 | `screenshots/CH-01-07-bloco-sem-comprovantes.png` | A-1 (comprovantes não entraram, registro gravou sem eles); A-4 (histórico sem quem registrou). Pago, aprovado, meio, data, observação ok. E-mail no Mailpit: não verificável no local (ver TC-INT-001) |
| TC-FUNC-001 | pass | 01, 06, 20 | — | M6 com a ação; M9 e M12 sem a ação e com o motivo pela URL. M2 (#0549/#0550) não aberto — os M6 vencido/recusado (#0568/#0569) mostraram a ação |
| TC-FUNC-002 | pass | 02, 12, 17 | `screenshots/CH-01-17-320.png` | Cinco meios exatos; hora de Brasília; vazio grava "Meio não informado". Segundo meio conferido com "Dinheiro" em vez de "Transferência". Variação "data apagada" → spec-gap |
| TC-FUNC-003 | pass | 13–16 | `screenshots/CH-01-15-data-anterior.png` | Futuro e anterior recusados com motivo, antes de gravar, formulário mantido. "Amanhã" testado como 23:59 de hoje (o calendário não foi aberto) |
| TC-FUNC-004 | fail | 07–11 | `screenshots/CH-01-12-segunda-escolha-ignorada.png` | A-1: depois da primeira escolha de arquivos, as seguintes são ignoradas — não dá para anexar o 2º comprovante noutra escolha nem tentar de novo após uma recusa. Na primeira escolha, todas as regras funcionam (tipo, 10 MB, 10 MB exato aceito, HEIC aceito, máximo 3) |
| TC-FUNC-005 | pass | 06, 12, 18 | — | Toque duplo: um registro, uma linha. Voltar e reenviar: "já está pago". Estoque e cupom não conferidos (o #0564 não foi usado) |
| TC-INT-001 | blocked | 05, 16, 18 | — | Ambiente: o e-mail à cliente sai pelo Resend com chave inválida e não chega ao Mailpit; o aviso interno não é observável. Pulado registra "Você escolheu não avisar" (passo 16), mas A-2. Pedido que espera material (#0566) não registrado |
| TC-UI-001 | fail | 01, 11, 17, 21 | `screenshots/CH-01-17-320.png` | A-3: botão de data 40 px e "Limpar data" 36 px. Sem rolagem lateral em 390, 320 e 1440, com quatro nomes longos; `accept` com os cinco tipos e sem `capture` (o sistema oferece câmera e galeria); portão cabe em 390. Paisagem e teclado virtual não testados |

Contagem: pass 4 · fail 3 · blocked 1 · skip 0

## Achados

### A-1 · [Registrar pagamento] Depois da primeira escolha de arquivos, as outras são ignoradas em silêncio — o comprovante some e o registro grava sem ele

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, passo 3 (anexar) · passos 03, 07, 09, 10 do log                 |
| TC                  | TC-JOURNEY-001, TC-FUNC-004                                           |
| Gravidade proposta  | high — a Adri escolhe o print do PIX, nada aparece (ou só o primeiro), e o pagamento vai gravado sem a prova; tentar de novo não adianta, e a tela não diz nada |
| Reproduziu          | sim (4 de 4: #0567 duas escolhas; #0571 GIF → JPG; #0571 JPG → PNG → WebP; #0571 JPG → PDF pelo seletor) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abrir `http://localhost:8083/admin/pedidos/<pedido M6 pendente>/pagamento` em 390 × 844
2. Tocar em "Comprovantes" e escolher `comprovante-qa98.jpg` — ele aparece na lista com "Tirar comprovante-qa98.jpg"
3. Tocar de novo em "Comprovantes" e escolher `comprovante-qa98.pdf` — o PDF não entra; a lista continua só com o JPG, sem mensagem
4. Variação: escolher primeiro o GIF (aparece a recusa) e depois um JPG válido — o JPG não entra
5. Variação vista na jornada (#0567): a primeira tentativa de tocar no campo não abriu o seletor; daí em diante nenhuma escolha (JPG+PDF, PNG) entrou, e "Registrar pagamento" gravou o pedido como pago sem comprovante

**Esperado:** cada escolha acrescenta à lista até três; recusa só o que fere a regra, com o motivo, sem perder o resto — **fonte:** PRD CA-03.2, CA-03.10; TC-FUNC-004 passos 1–5 ("um de cada vez"); charter CH-01, "Deve tentar" 3

**Observado:** só a primeira seleção do seletor de arquivos é processada; as seguintes não mudam a lista nem mostram aviso. Nenhum erro no console. Numa tela nova, cada regra funciona na primeira escolha (passo 11 do log).

**Evidência:**

- `screenshots/CH-01-09-primeira-escolha-listada.png` — o JPG da primeira escolha listado
- `screenshots/CH-01-12-segunda-escolha-ignorada.png` — depois de escolher o PDF numa segunda vez, a lista só tem o JPG
- `screenshots/CH-01-07-bloco-sem-comprovantes.png` — o #0567 gravado sem comprovante
- console: nada
- rede: nenhuma requisição ao escolher (esperado; o envio é no confirmar)

### A-2 · [Registrar pagamento] Com a rede caindo logo depois de confirmar sem e-mail, o aviso diz "anotado no histórico" e a anotação não existe

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, passo 5 (confirmar no portão, e-mail desmarcado) · passos 18–19 do log |
| TC                  | TC-INT-001, TC-FUNC-005                                               |
| Gravidade proposta  | medium — no 4G instável, o pedido fica pago sem a linha "Aviso à cliente não enviado" (e sem o avião para enviar depois), enquanto a tela afirmou o contrário; a Adri perde o registro de que a cliente não foi avisada |
| Reproduziu          | intermitente (1 de 2 — depende do instante do corte) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abrir `/admin/pedidos/<pedido M6 pendente>/pagamento` em 390 × 844
2. Tocar em "Registrar pagamento", desmarcar "Avisar a cliente por e-mail" e confirmar
3. ~150 ms depois do toque no confirmar, cortar a rede (offline); restaurar depois de alguns segundos e recarregar o pedido

**Esperado:** se a anotação do aviso pulado não gravou, a tela não diz que foi anotada, e o histórico ou o aviso deixam claro que falta; ou a anotação acompanha o registro — **fonte:** PRD CA-03.8 (portão da 88: o aviso pulado fica no histórico); TC-INT-001 passo 2; TC-FUNC-005 passo 3 ("a tela diz se gravou ou não")

**Observado:** aviso "Pagamento registrado · sem e-mail à cliente (anotado no histórico)". Histórico do #0572 depois de recarregar: só "Pendente → Pago · Pagamento registrado manualmente · 02:47:48". No #0569, com o corte depois de a tela do pedido abrir, a linha "Aviso à cliente não enviado: Pagamento aprovado · Você escolheu não avisar" existe.

**Evidência:**

- `screenshots/CH-01-18-offline.png` — o aviso "anotado no histórico" com a rede cortada (#0572)
- `screenshots/CH-01-19-controle-historico-com-aviso-pulado.png` — o controle (#0569), com a linha
- console: `POST …/functions/v1/send-notification?action=trigger → net::ERR_INTERNET_DISCONNECTED` (e `mercado-pago?action=close-charge`, fora do escopo)
- rede: idem

### A-3 · [Registrar pagamento] Os dois botões de data têm menos de 44 px no celular

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, passo 3 · passo 17 do log                                       |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — com uma mão, o toque na data ou no "limpar" erra mais fácil; não impede o registro (a data já vem preenchida) |
| Reproduziu          | sim (2 de 2: 320 × 568 e 390 × 844 mostram a mesma altura) |
| Viewport            | 320 × 568 e 390 × 844                                                 |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abrir `/admin/pedidos/<pedido M6>/pagamento` em 390 × 844
2. Medir a altura do botão "Data do pagamento (Brasília)" e do "Limpar Data do pagamento (Brasília)"

**Esperado:** ≥ 44 px em todo controle tocável — **fonte:** TC-UI-001; `CLAUDE.md` › Mobile ("alvo de toque abaixo de 44px")

**Observado:** botão de data 40 px; "Limpar data" 36 px. Os outros controles medem 44.

**Evidência:**

- `screenshots/CH-01-17-320.png` — a tela em 320
- console: nada
- rede: nada

### A-4 · [Pedido] O histórico não diz quem registrou o pagamento

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, passo 5 · passos 05, 12, 16 do log                              |
| TC                  | TC-JOURNEY-001                                                        |
| Gravidade proposta  | low — quem registrou aparece no bloco Pagamento ("Registrado por"), mas não na linha do histórico; com dois acessos no painel, o histórico sozinho não responde quem marcou pago |
| Reproduziu          | sim (4 de 4: #0567, #0571, #0565, #0570) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, registrar um pagamento em `/admin/pedidos/<pedido M6>/pagamento`
2. Ler o histórico do pedido

**Esperado:** "Pagamento registrado manualmente", o nome de quem registrou e a hora — **fonte:** TC-JOURNEY-001 passo 5

**Observado:** "Pendente → Pago · Pagamento registrado manualmente · 10/11/2026, 02:43:34", sem autor. O bloco mostra "Registrado por admin@umaestrelinha.dev" (o e-mail, não um nome).

**Evidência:**

- `screenshots/CH-01-07-bloco-sem-comprovantes.png` — o bloco com "Registrado por"
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| No celular, "Registrar pagamento" fica no fim da página do pedido (2.403 de 2.489 px, três telas abaixo), enquanto "Avançar mesmo assim" (marcar pago pelo status, sem registro) está no topo — a ação errada é a que está à mão | 01 | polimento |
| "Limpar data" troca a data por "Agora", mas a hora continua mostrando o valor digitado (02:31); o registro grava a hora de agora (02h47), não a que estava na tela | 15–16 | polimento |
| "Registrado por" mostra o e-mail da conta, não um nome | 05 | pré-existente |
| O bloco Pagamento mostra "Método: pix" em minúsculas, ao lado de "Meio: PIX direto" | 01, 05 | pré-existente |

## Fora da cobertura

- E-mail no Mailpit (pagamento confirmado, instruções do material, ausência do aviso interno) — ambiente: e-mail à cliente sai pelo Resend com chave inválida e não chega ao Mailpit
- Pedido que espera material (#0566) e o e-mail de instruções — orçamento
- Estoque da peça e usos do cupom depois do toque duplo (#0564) — orçamento
- Corte de rede no meio do upload de um comprovante grande — no local o upload de 10 MB termina antes do corte; precisaria de rede lenta, que o browser da sessão não emula
- Recarregar durante o envio; voltar no meio do formulário com arquivo anexado; girar para 844 × 390; teclado virtual aberto na observação; arrastar arquivo em 1440 — orçamento
- "Tirar" um anexo e escolher de novo depois de A-1 — orçamento
- Data de amanhã pelo calendário (usado 23:59 de hoje); a hora exata de criação com segundos; fuso `America/Manaus` — orçamento
- Extensão trocada (`.txt` renomeado `.jpg`) — orçamento
- Abrir o comprovante gravado ("Abrir comprovante 1 (JPG)") — fora da missão (CH-03)

## Debrief

- **Surpresas:** A-1 só aparece depois da primeira escolha; cada regra de arquivo, testada isolada numa tela nova, passa — um teste que abre a tela, escolhe uma vez e confere não pega. A anotação do aviso pulado é uma segunda chamada, separada do registro (A-2)
- **Próximo charter:** reteste de A-1 com o seletor de verdade num Android (galeria e câmera, uma foto por vez — o uso real da Adri); rede lenta (throttling) no envio de comprovante grande
- **Padrão novo:** "escolher de novo" — em todo campo de arquivo, fazer uma segunda seleção depois da primeira (válida, recusada ou cancelada) antes de conferir a lista
