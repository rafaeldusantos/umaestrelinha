import { TAP_ROW } from '@/shared/lib/touchTarget'
import { ATALHOS_DE_MATERIAL, useMaterialDrawerStore } from '@/entities/material'

/**
 * "Qual é o seu material?" — a única pergunta que a loja faz na gaveta (`GAV-09`, `GAV-10`).
 *
 * **A lista é `ATALHOS_DE_MATERIAL`, derivada das três listas do guia** — fichas ricas, cartões de
 * preparo simples e preparo em casa. Escrever uma segunda lista aqui daria um chip apontando para um
 * material que a gaveta não sabe renderizar, e o erro sairia como corpo vazio: sem erro no console,
 * sem 404, sem nada.
 *
 * **É a QUARTA tela da mesma espécie de chip** — nasceram na página do produto (`MaterialNotice`),
 * seguiram para a confirmação do pedido (`OrderMaterialBlock`) e para o topo do guia
 * (`MaterialShortcuts`). Pílula é a forma deles, e `buttonShape.test.ts` registra a razão: são
 * **rótulos que nomeiam material, não CTAs**. A cliente reconhece o mesmo objeto nas quatro telas.
 *
 * Usam `rotuloCurto` e não `rotulo`, ao contrário do seletor do guia: ali a cliente já está lendo a
 * página e os chips são navegação; aqui o chip é a **porta de entrada** da resposta. Medido no mock
 * com os títulos completos: 7 fileiras, e a ficha fora da tela.
 *
 * O estado escolhido é dito por `aria-pressed`, não só por cor — cor sozinha não chega a quem usa
 * leitor de tela, e é também o que torna o estado asserível sem depender de classe.
 */
const MaterialDrawerChips = () => {
  const anchor = useMaterialDrawerStore(s => s.anchor)
  const setAnchor = useMaterialDrawerStore(s => s.setAnchor)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[18px] font-semibold leading-6 tracking-[-0.01em] text-estrelinha-ink">
          Qual é o seu material?
        </h3>
        <p className="text-[13px] leading-[19px] text-estrelinha-ink-soft">
          Toque no seu para ver a quantidade, o recipiente e o vídeo.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {ATALHOS_DE_MATERIAL.map(atalho => {
          const escolhido = atalho.anchor === anchor
          return (
            <li key={atalho.anchor}>
              <button
                type="button"
                aria-pressed={escolhido}
                onClick={() => setAnchor(atalho.anchor)}
                className={`${TAP_ROW} h-11 justify-center rounded-pill px-4 text-[14px] transition-colors ${
                  escolhido
                    ? 'border border-estrelinha-primary bg-estrelinha-primary font-semibold text-estrelinha-on-primary'
                    : 'border border-estrelinha-line bg-estrelinha-surface font-medium text-estrelinha-ink hover:border-estrelinha-field'
                }`}
              >
                {atalho.rotuloCurto}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default MaterialDrawerChips
