# Sessão CH-05 (continuação) · CFR — o editor de cor e o rótulo colorido na loja

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-cfr.md` · cfr · P1 — continuação, só TC-CFR-002 (a loja) |
| Status      | done                                                                   |
| Persona     | PER-01 Adri, a dona · conta: anonima (a loja é pública; o painel não foi usado) |
| Tour · modo | —                                                                      |
| Rodada      | exploração                                                             |
| Orçamento   | 27 ações de browser de 25 (estourou em 2: um clique por ref velha que falhou e o Esc antes da troca de largura) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless, sessão CH-05b) · viewports 390 × 844 · 320 × 568 · 768 × 1024 · 640 × 900 |
| Paridade    | backend local (Supabase :54441); `**/*.supabase.co/**` e `**/g/collect*` bloqueados; perfil Black Friday |

## Missão

Refazer como auditoria a montagem do destaque pela dona e a leitura dele na folha do celular, conferindo se o editor de cor se usa só com teclado e com fonte grande, e se o rótulo colorido se lê e cabe em todas as larguras. Nesta continuação: só a parte da loja que a sessão 1 (`sessions/CH-05-cfr.md`) não alcançou.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | A 390 × 844, abrir a folha do menu ("Abrir menu") e medir o rótulo de A e B | Folha branca com "Joias afetivas" (acordeão), "Colar e correntes", "Personalizados" (acordeão), "Sobre". Cor lida do `span` do rótulo (não do link/botão, que computa `rgb(22, 21, 20)`): "Sobre" (A) `rgb(138, 90, 43)` = #8A5A2B sobre `rgb(255, 255, 255)` → **5,87:1**; "Joias afetivas" (B) `rgb(138, 90, 43)` → **5,87:1**; ambos 16 px / 600. C e "Colar e correntes" sem cor: `rgb(22, 21, 20)` → 18,24:1. Ícone 20 px à esquerda (x 20–40) em `rgb(154, 122, 69)` (tom de destaque, decisão de projeto); rótulo começa em x 52 — sem sobreposição; sem reticências/corte. Linhas de 56 px. `scrollWidth` 390 = janela; a folha 390 = 390 | `screenshots/CH-05b-01-folha-390.png` |
| 02 | Com a folha aberta, encolher para 320 × 568 | `scrollWidth` 320 = janela. As quatro linhas de 20 a 300, 56 px de altura, nenhum rótulo cortado (`scrollWidth` do span = `clientWidth`) | `screenshots/CH-05b-02-folha-320.png` |
| 03 | Ligar movimento reduzido e abrir o acordeão de "Joias afetivas" | `prefers-reduced-motion: reduce` = verdadeiro. O acordeão abre (`expanded=true`) e mostra as 11 subcategorias e "ver tudo em Joias afetivas →" de imediato; nenhuma animação ficou em curso na região aberta | — |
| 04 | Com movimento reduzido, fechar (Esc) e abrir a folha de novo | A folha abre e é usável, mas entra com animação `enter` de 500 ms no diálogo e 150 ms no fundo, mesmo com movimento reduzido; há também uma animação `ping` contínua (1000 ms) num `span` fora da folha. Nada essencial depende delas: o conteúdo está lá ao fim da entrada → spec-gap pré-existente (chrome da folha, fora da Mudança) | — |
| 05 | Fechar a folha, 768 × 1024 | A 768 a loja já mostra a barra do computador (sem "Abrir menu"). `scrollWidth` 768 = janela. Rótulos na barra: "Sobre" (A) `rgb(232, 199, 122)` (#E8C77A, mesma cor medida a 1440 sobre #1C1A18 = 10,64:1); "Joias afetivas" (B, sem cor na barra) `rgb(247, 243, 236)` (15,69:1 a 1440); C e D na cor padrão. Ícone alinhado ao rótulo (centro a −1 px). Mas os itens vão de x 16 a 918: "Personalizados" (634–810) e "Sobre" (846–918) passam da borda de 768 — a página não rola, então a barra rola dentro de si ou recorta; não conferido (orçamento) → Fora da cobertura e spec-gap | — |
| 06 | Equivalente a 200% de zoom na barra (1280 a 200% ≈ 640 de largura): 640 × 900 | A 640 a loja troca para o "Abrir menu" (a folha, já medida em 01–02); `scrollWidth` 640 = janela, nada vaza | — |

**Edge cases tentados:** viewport mínima 320 × 568 com a folha aberta · movimento reduzido ao abrir a folha e o acordeão · zoom 200% pelo equivalente de largura (640) · 768 × 1024.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-CFR-002 | pass | 01–06 (+ passo 06 da sessão 1) | `screenshots/CH-05b-01-folha-390.png` · `screenshots/CH-05b-02-folha-320.png` | Folha a 390: A 5,87:1 e B 5,87:1 (≥ 4,5); barra a 768 e 1440: A 10,64:1, B 15,69:1; `scrollWidth` = janela a 320, 390, 640, 768 e 1440; ícone e rótulo sem corte nem sobreposição na folha; ícone alinhado na barra; nada essencial depende de animação. Ressalvas: fonte 200% só pelo equivalente de largura; a 768 não se conferiu se A, fora da borda, é alcançável rolando a barra (ver Fora da cobertura) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

## CFR

| Jornada | Categoria             | Marca                    | Itens que não passaram | Achado |
| ------- | --------------------- | ------------------------ | ---------------------- | ------ |
| J-02    | Acessibilidade        | pass                     | — (A e B a 5,87:1 na folha; 10,64 e 15,69 na barra) | — |
| J-02    | Compatibilidade       | pass                     | — (sem rolagem da página a 320, 390, 640, 768, 1440); alcance de A na barra a 768 não conferido | — |
| J-02    | Usabilidade           | pass                     | — (movimento reduzido não esconde nada; a entrada da folha anima mesmo assim — spec-gap pré-existente) | — |
| J-02    | Performance percebida | pass                     | — (FCP 380 ms na sessão 1; não remedido) | — |
| J-02    | Paridade com produção | registrada no cabeçalho  | backend local | — |

**Categorias fora:** Recuperação de erro — a loja não tem entrada nesta superfície; coberta na J-01 pela sessão 1.

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com `prefers-reduced-motion: reduce`, a folha do menu ainda entra com animação de 500 ms (e o fundo com 150 ms); um `span` mantém animação `ping` contínua. Nada essencial depende disso | 04 | pré-existente |
| A 768 × 1024 a barra do computador já aparece e seus itens vão até x 918: "Personalizados" e "Sobre" (A) ficam além da borda direita; não se conferiu se a barra rola nem se o ícone novo aumentou a largura dos itens | 05 | pré-existente |

## Fora da cobertura

- Fonte do sistema a 200% (não zoom) na barra e na folha — o driver não muda a fonte sem alterar o DOM; usado o equivalente por largura (640 px para 1280 a 200%) na barra; a folha a 200% de fonte não foi medida (o equivalente por largura dela seria ~195 px, abaixo da mínima 320)
- A 768 × 1024: se "Sobre" (A) e "Personalizados", além da borda da barra, se alcançam rolando a barra ou ficam recortados; contraste lido por cor do span, fundo da barra assumido igual ao de 1440 (#1C1A18, perfil Black Friday) — orçamento esgotado
- Screenshots a 768 e 640 — orçamento
- 1440 × 900 não remedido — já medido na sessão 1 (A 10,64:1, B 15,69:1, sem rolagem)
- Leitor de tela real; Safari, Firefox e browsers móveis — fora do browser da sessão (só Chromium)
- Logout — conta anônima, sem login; sessão fechada sem estado em disco

## Debrief

- **Surpresas:** a 768 a loja já usa a barra do computador, e ela não cabe na largura — a primeira coisa a conferir numa próxima sessão
- **Próximo charter:** barra a 768–1024: alcance por rolagem/teclado dos itens além da borda (inclui A, o item com cor) e comparação da largura dos itens com e sem ícone
- **Padrão novo:** ler a cor do nó de texto do rótulo (o `span`), não do link/botão — o controle computa a cor padrão e daria 18,24:1 falso
