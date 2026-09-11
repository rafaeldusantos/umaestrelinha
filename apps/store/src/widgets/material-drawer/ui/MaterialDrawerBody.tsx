import { materialAnchor } from '@estrelinha/core/material'
import { ESTRELINHA_ICONS } from '@estrelinha/ui/icons'
import {
  CARTOES_DE_MATERIAL,
  FICHAS_DE_MATERIAL,
  MaterialAviso,
  PREPARO_EM_CASA,
} from '@/entities/material'
import MaterialDrawerVideo from './MaterialDrawerVideo'
import MaterialDrawerWhatsApp from './MaterialDrawerWhatsApp'

/**
 * O corpo da gaveta — o conteúdo do material que a cliente escolheu (`GAV-11`..`GAV-13`).
 *
 * **Três formatos, porque o guia tem três**, e a diferença entre eles é informação real sobre o
 * material, não variação de desenho:
 *
 * - **Ficha rica** (leite, cabelos e pelos, cinzas): quantidade, recipientes aceitos, passos de
 *   preparo, avisos e vídeo. São os três que mais geram dúvida.
 * - **Cartão simples** (dentes, coto, unhas, flores, outro): o preparo cabe em duas linhas.
 * - **Preparo em casa** (placenta, sangue desidratado): chegam desidratados, e o trabalho é anterior
 *   ao envio.
 *
 * **Bloco que não existe não é renderizado vazio.** Um cartão simples não tem quantidade definida —
 * desenhar "QUANTIDADE —" ali seria a loja fingindo uma precisão que não tem, e é a mesma régua que
 * fez `MaterialAddress` não renderizar endereço pela metade na feature `31`.
 *
 * Âncora desconhecida devolve `null` em vez de erro: a gaveta continua útil com chips e passos, e a
 * cliente não vê uma tela quebrada por causa de um estado que não deveria existir.
 */
interface Props {
  anchor: string
}

const Rotulo = ({ children }: { children: string }) => (
  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-estrelinha-ink-soft">
    {children}
  </span>
)

const Moldura = ({ titulo, icone, children }: { titulo: string; icone: string; children: React.ReactNode }) => {
  const Icone = ESTRELINHA_ICONS[icone as keyof typeof ESTRELINHA_ICONS]

  return (
    <section
      data-testid="material-drawer-body"
      className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-ground p-4"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep"
        >
          {Icone && <Icone className="h-[22px] w-[22px] text-estrelinha-primary" />}
        </span>
        <h4 className="min-w-0 flex-1 font-display text-[18px] font-semibold leading-6 tracking-[-0.01em] text-estrelinha-ink">
          {titulo}
        </h4>
      </div>
      {children}
    </section>
  )
}

const Passos = ({ passos }: { passos: readonly string[] }) => (
  <div className="flex flex-col gap-2.5 border-t border-estrelinha-line pt-4">
    <Rotulo>Como preparar</Rotulo>
    <ol className="flex flex-col gap-2.5">
      {passos.map((texto, i) => (
        <li key={texto} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep text-[11px] font-bold text-estrelinha-primary"
          >
            {i + 1}
          </span>
          <span className="flex-1 text-[14px] leading-[22px] text-estrelinha-ink">{texto}</span>
        </li>
      ))}
    </ol>
  </div>
)

const MaterialDrawerBody = ({ anchor }: Props) => {
  const ficha = FICHAS_DE_MATERIAL.find(f => materialAnchor(f.kind) === anchor)
  if (ficha) {
    return (
      <Moldura titulo={ficha.titulo} icone={ficha.icone}>
        <div className="flex flex-col gap-3.5 border-t border-estrelinha-line pt-4">
          <div className="flex flex-col gap-1">
            <Rotulo>Quantidade</Rotulo>
            <span className="font-display text-[17px] font-semibold leading-[22px] text-estrelinha-ink">
              {ficha.quantidade.valor}
            </span>
            <span className="text-[13px] leading-[18px] text-estrelinha-ink-soft">
              {ficha.quantidade.nota}
            </span>
          </div>

          <div className="h-px w-full bg-estrelinha-line" />

          <div className="flex flex-col gap-1.5">
            <Rotulo>{ficha.listaTitulo}</Rotulo>
            <ul className="flex flex-col gap-1.5">
              {ficha.lista.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-estrelinha-accent"
                  />
                  <span className="text-[14px] leading-5 text-estrelinha-ink">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Passos passos={ficha.passos.map(p => p.texto)} />

        {ficha.avisos.map(aviso => (
          <MaterialAviso key={aviso.texto} aviso={aviso} surface="gaveta" />
        ))}

        <MaterialDrawerVideo kind={ficha.kind} />
      </Moldura>
    )
  }

  const cartao = CARTOES_DE_MATERIAL.find(c => c.anchor === anchor)
  if (cartao) {
    return (
      <Moldura titulo={cartao.titulo} icone={cartao.icone}>
        <ul className="flex flex-col gap-2.5 border-t border-estrelinha-line pt-4">
          {cartao.itens.map(item => (
            <li key={item} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-estrelinha-accent"
              />
              <span className="flex-1 text-[14px] leading-[22px] text-estrelinha-ink">{item}</span>
            </li>
          ))}
        </ul>
        {cartao.kind && <MaterialDrawerVideo kind={cartao.kind} />}
        {/* `Outro material` manda falar com a loja antes de enviar — então a gaveta tem de dizer
            COMO. Só neste cartão: nos outros o preparo está escrito e a conversa é opcional. */}
        {cartao.kind === 'outro' && <MaterialDrawerWhatsApp />}
      </Moldura>
    )
  }

  const preparo = PREPARO_EM_CASA.find(p => p.anchor === anchor)
  if (preparo) {
    return (
      <Moldura titulo={preparo.titulo} icone={preparo.icone}>
        <div className="border-t border-estrelinha-line pt-4">
          <MaterialAviso aviso={{ tom: 'alerta', texto: preparo.aviso }} surface="gaveta" />
        </div>
        <Passos passos={preparo.passos} />
      </Moldura>
    )
  }

  return null
}

export default MaterialDrawerBody
