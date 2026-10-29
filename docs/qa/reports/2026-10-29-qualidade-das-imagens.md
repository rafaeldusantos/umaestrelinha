# QA Run Report — 2026-10-29 — qualidade das imagens (feature 87)

- **Scope:** feature `87` (não commitada sobre `bcc11ce1`): rendições de 1080 nas vagas de largura cheia, zoom de 1600 só no hover, envio do painel sem recompressão desnecessária (0.92, `high`, 2400).
- **Cadence tier:** targeted
- **Build:** árvore de trabalho sobre `bcc11ce1` · **Environment:** loja `pnpm dev:store` :8082, painel `pnpm dev:backoffice` :8083, Supabase local :54441. `*.supabase.co` e `**/g/collect*` bloqueados por rota.
- **Started:** 2026-10-29 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Cliente navegando pelo menu | Casual User | 390×844 DPR 3 touch / 1440 DPR 2 mouse · wifi e Slow 4G · pt-BR | CH-imagem-joia-nitida-no-celular, CH-imagem-banners-da-home, CH-imagem-zoom-no-computador, CH-imagem-rede-lenta |
| Adri cadastrando peças | Power User | 1440 e 390 · wifi · pt-BR | CH-imagem-enviar-pelo-painel |

## Flows in Scope

- `J-ver-a-joia-nitida` — a joia e os banners nítidos no celular sem pesar mais na categoria (`../journeys/J-ver-a-joia-nitida.md`)
- `J-enviar-foto-pelo-painel` — a foto enviada é guardada como foi enviada (`../journeys/J-enviar-foto-pelo-painel.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-imagem-joia-nitida-no-celular | J-ver-a-joia-nitida / LOJA-imagem-foto-principal-celular, -trocar-de-foto-celular, -categoria-sem-peso-extra, -tela-cheia-intacta | Cliente navegando pelo menu | Money Tour | Pass | | |
| 2 | CH-imagem-enviar-pelo-painel | J-enviar-foto-pelo-painel / PNL-imagem-* | Adri cadastrando peças | Garbage Tour | Pass | BUG-20261029-produto-inexistente-abre-formulario-vazio (fora da 87) | |
| 3 | CH-imagem-banners-da-home | J-ver-a-joia-nitida / LOJA-imagem-banners-da-home, -foto-de-fora | Cliente navegando pelo menu | Feature Tour | Pass | | |
| 4 | CH-imagem-zoom-no-computador | J-ver-a-joia-nitida / LOJA-imagem-zoom-computador, -foto-de-fora | Cliente navegando pelo menu | Feature Tour | Pass | | |
| 5 | CH-imagem-rede-lenta | J-ver-a-joia-nitida / LOJA-imagem-rede-lenta | Cliente navegando pelo menu | Network Tour | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### CH-imagem-joia-nitida-no-celular — Cliente navegando pelo menu

- **Ran:** 390×844 DPR 3 touch, entrando pela categoria `/joias-afetivas` (box respeitado)
- **Findings:** nenhum defeito. Categoria: 12 imagens, todas `width=720`. Produto (`pingente-afetivo-barquinho-com-cabelo`): o palco do celular escolhe `width=1080`; o palco do computador, escondido, tem o mesmo `currentSrc` (uma foto baixada); trocar pela miniatura traz o 1080 da foto 2, uma vez; a tela cheia abre o ORIGINAL (`object/public`), como antes. `scrollWidth` 390.
- **Bugs filed/updated:** —
- **Scenarios settled:** LOJA-imagem-foto-principal-celular → pass; -trocar-de-foto-celular → pass; -categoria-sem-peso-extra → pass; -tela-cheia-intacta → pass
- **Paper cuts:** a tela cheia baixa os ORIGINAIS de todas as fotos da peça ao abrir (5 de ~100–550 KB) — comportamento anterior à 87 (PRF-02 AC 6), registrado aqui só como observação de peso.
- **Surprises:** um `naturalWidth` de 369 lido no meio do carregamento parecia origem pequena; a rendição tem 1024×1280 (conferido por `identify`). Amostra de 80 fotos principais do catálogo: todas entre 720 e 1079 px de largura (a origem da Nuvemshop é 1024), então a 1080 entrega 1024 — o teto de nitidez das fotos importadas é a origem.
- **Suggested next charter:** o mesmo percurso num iPhone/Android real.

### CH-imagem-enviar-pelo-painel — Adri cadastrando peças

- **Ran:** 1440×900, Resumo → Adicionar imagens (input real da tela); dica em 390 a 100 % e 200 %
- **Findings:** os seis arquivos se comportaram como a spec. Baixados do Storage e conferidos: WebP 1024×1280 → **mesmo SHA-256**; WebP 2400×1600 → **mesmo SHA-256**; WebP 2401×1000 → WebP 2400×1000; JPEG 4000×3000 → WebP 2400×1800 (706 KB); PNG 600×600 transparente → WebP `srgba` com alfa 0 no canto e 1 no centro; `.webp` corrompido → aviso "corrompido.webp: falha ao enviar", linha "falhou", nada gravado. Dica: "PNG, JPG ou WebP até 8 MB · até 2400 px no maior lado", 2 linhas a 100 % e 4 a 200 %, dentro da área (o corpo do modal rola).
- **Bugs filed/updated:** BUG-20261029-produto-inexistente-abre-formulario-vazio (achado ao abrir um id errado; **não é da 87**).
- **Scenarios settled:** PNL-imagem-webp-intacto, -foto-grande-reduzida, -png-transparente-na-home (pelo motor comum, via galeria do produto — a Lista de categorias da Home usa o mesmo `uploadImageBlob`), -arquivo-corrompido, -dica-da-area-de-envio → pass
- **Paper cuts:** a 200 % a página de edição do produto rola de lado em 390 (`scrollWidth` 571) — anterior à 87 (tabela de variações, já registrada no `CLAUDE.md`).
- **Surprises:** —
- **Suggested next charter:** o envio pela arte da Home e pelo banner do menu na própria tela.
- Limpeza: os 5 objetos gravados foram apagados do Storage local; nenhum produto foi salvo.

### CH-imagem-banners-da-home — Cliente navegando pelo menu

- **Ran:** 390 @3x e 1440 @2x, com `home_sections`/`home_section_items` interceptados (as artes do banco local apontam para o hospedado, bloqueado) e trocados por uma foto do Storage local
- **Findings:** 390: as 5 artes de largura cheia têm `srcset` largo (Banner principal do celular 360/720/1080; grade 360/480/720/1080) e todas escolhem **1080**; só a largura 1080 foi pedida. 1440: o `<source>` do Banner principal segue 840/1680 e escolhe 1680; a grade (612 px CSS @2x) escolhe 1080. `scrollWidth` 390 e 1440.
- **Scenarios settled:** LOJA-imagem-banners-da-home → pass. LOJA-imagem-foto-de-fora → **não andado** (não há arte nem foto externa no banco local; coberto só pelos testes de componente).

### CH-imagem-zoom-no-computador — Cliente navegando pelo menu

- **Ran:** 1440×900 DPR 2
- **Findings:** zero `width=1600` antes do ponteiro; um depois (a foto ativa); sair e voltar não pede de novo; trocar para a foto 2 e voltar ao palco pede o 1600 da foto 2 e a camada mostra a foto nova. O detalhe ampliado fica limitado pela origem de 1024 nas fotos importadas.
- **Surprises:** o primeiro roteiro registrou zero pedidos depois do hover — era artefato: o `hover()` na miniatura rolou a página 398 px e o ponto alvo caiu sob o cabeçalho. Refeito com a página no topo.
- **Scenarios settled:** LOJA-imagem-zoom-computador → pass

### CH-imagem-rede-lenta — Cliente navegando pelo menu

- **Ran:** build de produção (`vite preview` :4187), 390 @3x, 1,6 Mbps/150 ms, CPU 4×. A primeira tentativa no servidor de dev foi descartada (LCP de 46 s medindo módulos soltos, não a foto).
- **Findings:** LCP = a foto principal de 1080 aos **4,84 s**; o primeiro conteúdo (texto) aos 2,2 s; a foto levou 1,38 s para descer (58,6 KB). O A/B com 720 forçado por rota **não vale** (o `route.fetch` do Playwright foge do limite de rede); pela proporção de bytes (32 × 58,6 KB) a diferença estimada é **+0,5 a +0,6 s** no LCP. Custo aceito na spec (≤ 2× bytes), declarado aqui como estimativa.
- **Scenarios settled:** LOJA-imagem-rede-lenta → pass

## What Was Fixed

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Cliente | J-ver-a-joia-nitida, tela cheia | baixa os originais de todas as fotos ao abrir | baixa | anterior à 87; observação |
| Adri | J-enviar-foto-pelo-painel, edição a 200 % | a página rola de lado em 390 | média | anterior à 87 (tabela de variações) |

## Decisions for a Human

- **BUG-20261029-produto-inexistente-abre-formulario-vazio** (fora da 87): mostrar "peça não encontrada" com volta à lista, e não aceitar envio. Recomendação: consertar numa tarefa própria do painel; não entra na 87 (o governor não permite fix fora do escopo da mudança).
- **Fotos importadas da Nuvemshop têm 1024 px**: a 1080 entrega 1024, e o zoom amplia uma origem de 1024. Ganho maior de nitidez nelas só reenviando originais maiores — decisão de curadoria, não de código.

## Experiential lens pass

Re-walk de `J-ver-a-joia-nitida` (celular) e `J-enviar-foto-pelo-painel`: nitidez (pass — a foto principal sai a 1080 e a captura @3x não mostra borrão); peso/velocidade (friction — +0,5 s estimado no LCP em 4G lento, aceito); confiança (pass — nada que a cliente ou a dona veja mudou de lugar); clareza da copy (pass — a dica diz o teto); acessibilidade (pass — `alt` e nós inalterados); consistência (pass — card, miniatura e menu iguais a antes).

## Final Status

**Pronto para release, do ponto de vista da 87.** 5 de 5 sessões `Pass`; 12 de 13 cenários `pass` e 1 não andado (`LOJA-imagem-foto-de-fora`, sem dado externo no local; coberto por teste de componente). Nenhum defeito da 87. Um bug novo **fora** da 87 (Trust-Damage, P3) e duas observações de peso anteriores a ela. Totais por impacto: Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 (fora da 87) · Friction 0 · Cosmetic 0.

Exit gate (suíte automatizada, depois do fecho das lacunas do Verificador, um workspace por vez, exit fora de pipe): **core 4923/190 · backoffice 4504/243 · store 6231/335, os três exit 0**; `tsc` store 0 · backoffice 0.
