import { PASSOS_DO_ENVIO } from '@/entities/material'

/**
 * "O caminho" — os quatro passos do envio (`GAV-09`).
 *
 * São **iguais para todo mundo**, e é por isso que ficam abaixo da pergunta e não acima dela: o que
 * muda por material é a ficha, e é a ficha que a cliente veio buscar. Com os passos no topo eles
 * empurram os chips para fora da tela numa viewport de 390×844 — medido no mock, não suposto.
 *
 * O texto é o de `PASSOS_DO_ENVIO`, o mesmo que a página do guia desenha. A gaveta mostra título e
 * apoio; a página mostra os ícones e o desenho completo. Mesmo dado, duas montagens — que é
 * exatamente o que o dono único existe para permitir.
 *
 * O selo numerado sai `ink` sobre ouro (4,78:1) e não creme (2,52:1): é o mesmo desvio declarado que
 * a feature `31` registrou para os passos da página, e `accentText.test.ts` é quem guarda a régua.
 */
const MaterialDrawerSteps = () => (
  <section className="flex flex-col gap-3.5 pt-1">
    <div className="flex items-center gap-2.5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-estrelinha-ink-soft">
        O caminho
      </h3>
      <span aria-hidden className="h-px flex-1 bg-estrelinha-accent" />
    </div>

    <ol className="flex flex-col gap-3">
      {PASSOS_DO_ENVIO.map(passo => (
        <li key={passo.numero} className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-estrelinha-accent text-[12px] font-bold text-estrelinha-ink"
          >
            {passo.numero}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <span className="text-[15px] font-semibold leading-[19px] text-estrelinha-ink">
              {passo.titulo}
            </span>
            <span className="text-[13px] leading-[19px] text-estrelinha-ink-soft">
              {passo.texto}
            </span>
          </span>
        </li>
      ))}
    </ol>
  </section>
)

export default MaterialDrawerSteps
