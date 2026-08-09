#!/usr/bin/env bash
# Sensor de discriminação: injeta um defeito de COMPORTAMENTO por vez, roda a
# suíte que deveria pegá-lo, e reverte. Um mutante que sobrevive é um teste que
# não prova nada.
set -u
cd /c/Projetos/nanapin-store/apps/store

mutate() {
  local nome="$1" arquivo="$2" de="$3" para="$4" suite="$5"
  python -c "
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
if sys.argv[2] not in s:
    print('PADRAO-NAO-ENCONTRADO'); sys.exit(2)
p.write_text(s.replace(sys.argv[2], sys.argv[3], 1), encoding='utf-8')
" "$arquivo" "$de" "$para" || { echo "  $nome … SETUP FALHOU"; return; }

  if npx vitest run "$suite" >/dev/null 2>&1; then
    echo "  ✗ SOBREVIVEU  — $nome"
  else
    echo "  ✓ morto       — $nome"
  fi
  git checkout -- "$arquivo" 2>/dev/null
}

echo "── paleta ──────────────────────────────────────────────────────────"
mutate "Carmim vira o valor da v1 no App.css" \
  src/app/App.css "--nanita-jam: #a62348" "--nanita-jam: #b0176b" \
  src/shared/lib/__tests__/palette.test.ts

mutate "Mata-borrão volta ao #FFEFF6 (o defeito de 1,00:1)" \
  src/app/App.css "--nanita-sugar: #f7d6e0" "--nanita-sugar: #ffeff6" \
  src/shared/lib/__tests__/palette.test.ts

mutate "Tailwind e CSS discordam no Carbono" \
  ../../apps/store/tailwind.config.ts 'plum: "#7E5769"' 'plum: "#7A5C6B"' \
  src/shared/lib/__tests__/palette.test.ts

echo "── ordem de import ─────────────────────────────────────────────────"
mutate "App.css importado ANTES do pacote" \
  src/main.tsx 'import "@nanapin/ui/styles.css";
import "./app/App.css";' 'import "./app/App.css";
import "@nanapin/ui/styles.css";' \
  src/shared/lib/__tests__/importOrder.test.ts

echo "── forma de ação ───────────────────────────────────────────────────"
mutate "um CTA volta para pílula" \
  src/widgets/home-sections/ui/DropCountdown.tsx "rounded-button border border-white/20" "rounded-pill border border-white/20" \
  src/shared/ui/__tests__/buttonShape.test.ts

mutate "o botão da loja oferece pílula" \
  src/shared/ui/Button.tsx "'rounded-button border-2 border-transparent'," "'rounded-pill border-2 border-transparent'," \
  src/shared/ui/__tests__

mutate "button deixa de ser a última chave do raio" \
  ../../apps/store/tailwind.config.ts '        pill: "999px",
        button: "14px",' '        button: "14px",
        pill: "999px",' \
  src/shared/ui/__tests__/buttonShape.test.ts

echo "── borda de campo ──────────────────────────────────────────────────"
mutate "CEP volta para Dobra" \
  src/features/shipping-calc/ui/ShippingCalc.tsx "border border-nanita-rule bg-white px-3.5" "border border-nanita-border bg-white px-3.5" \
  src/shared/lib/__tests__/fieldBorder.test.ts

echo "── a marca ─────────────────────────────────────────────────────────"
mutate "descritor do lockup vira Carbono sobre Grafite" \
  src/shared/ui/brand/NanitaLockup.tsx "ink: '#EBDDD7'," "ink: '#7E5769'," \
  src/shared/ui/brand

mutate "wordmark deixa de cair para o monograma abaixo do piso" \
  src/shared/ui/brand/NanitaWordmark.tsx "if (width < WORDMARK_FLOOR) {" "if (false) {" \
  src/shared/ui/brand

mutate "path do wordmark perde o evenodd" \
  src/shared/ui/brand/NanitaWordmark.tsx '<path fillRule="evenodd" d={WORDMARK_D} fill={fill} />' '<path d={WORDMARK_D} fill={fill} />' \
  src/shared/ui/brand

mutate "uma coordenada do monograma é trocada" \
  src/shared/ui/brand/paths.ts "'M0 0L0 159.25" "'M0 0L0 158.25" \
  src/shared/ui/brand

echo "── favicon ─────────────────────────────────────────────────────────"
mutate "favicon volta a ser disco" \
  public/favicon.svg 'rx="18"' 'rx="32"' \
  src/app/__tests__/brandAssets.test.ts

mutate "theme-color fica na geleia velha" \
  ../../apps/store/index.html 'content="#A62348"' 'content="#B0176B"' \
  src/app/__tests__/brandAssets.test.ts

mutate "Berkshire volta ao link de fontes" \
  ../../apps/store/index.html "css2?family=Fredoka" "css2?family=Berkshire+Swash&family=Fredoka" \
  src/app/__tests__/brandAssets.test.ts

echo "── home ────────────────────────────────────────────────────────────"
mutate "ritmo do card de coleção inverte 1º e 2º" \
  src/widgets/category-grid/ui/CategoryGrid.tsx "    card: 'bg-nanita-glaze',
    title: 'text-nanita-ink'," "    card: 'bg-nanita-ink',
    title: 'text-nanita-glaze'," \
  src/widgets/category-grid

mutate "preço do card de produto vira Carbono" \
  src/entities/product/ui/ProductCard.tsx "leading-[1.2] text-nanita-jam" "leading-[1.2] text-nanita-plum" \
  src/entities/product/ui/__tests__/ProductCardSurface.test.tsx

mutate 'selo "Novo" ganha cor de dinheiro' \
  src/entities/product/ui/ProductCard.tsx "tone === 'jam' ? 'bg-nanita-jam' : 'bg-nanita-ink'" "'bg-nanita-jam'" \
  src/entities/product/ui/__tests__/ProductCardSurface.test.tsx

mutate 'disco de adicionar vira 14px' \
  src/entities/product/ui/ProductCard.tsx "rounded-full bg-nanita-ink transition-transform hover:scale-110 active:scale-95" "rounded-button bg-nanita-ink transition-transform hover:scale-110 active:scale-95" \
  src/entities/product/ui/__tests__/ProductCardSurface.test.tsx

echo
echo "git status após o sensor (deve estar limpo):"
git -C /c/Projetos/nanapin-store status --porcelain | head
