import { useState } from 'react'
import { FICHAS_DE_MATERIAL } from '../model/guide'
import GuideHeading from './GuideHeading'
import GuideSection from './GuideSection'
import MaterialFicha from './MaterialFicha'
import MaterialShortcuts from './MaterialShortcuts'
import SimpleMaterialCards from './SimpleMaterialCards'

/**
 * "Encontre o seu material" (`5MC-0` / `6AU-0`) — os atalhos, as três fichas ricas e os cartões.
 *
 * **O estado do acordeão vive aqui, não em cada ficha**, e é uma lista de abertas em vez de um índice
 * único: no board mobile a primeira nasce aberta e as outras fecham, mas nada impede a cliente de
 * querer duas ao mesmo tempo — leite e cabelo é o par de uma joia que leva os dois. Um índice único
 * fecharia a primeira ao abrir a segunda, e ela perderia o lugar onde estava lendo.
 */
interface MaterialsSectionProps {
  compacta: boolean
  onVerVideo: (videoId: string) => void
}

const MaterialsSection = ({ compacta, onVerVideo }: MaterialsSectionProps) => {
  // A primeira nasce aberta: acordeão inteiramente fechado é uma página que parece vazia.
  const [abertas, setAbertas] = useState<readonly string[]>([FICHAS_DE_MATERIAL[0].kind])

  const alternar = (kind: string) =>
    setAbertas(atual =>
      atual.includes(kind) ? atual.filter(item => item !== kind) : [...atual, kind],
    )

  return (
    // Branco, e não o chão da loja: os cartões de passo e a caixa de quantidade são `ground`, e sobre
    // `ground` eles desapareceriam. É a medida do board (`5SP-0`), não escolha de gosto.
    <GuideSection
      tone="surface"
      labelledBy="guia-materiais"
      className="border-t border-estrelinha-line"
    >
      <div className="flex flex-col gap-8 md:gap-10">
        <GuideHeading
          id="guia-materiais"
          versalete="Orientação por material"
          titulo="Encontre o seu material"
          apoio="Cada material tem uma quantidade e um recipiente indicados. Toque no seu para ir direto ao preparo."
        />

        <MaterialShortcuts />

        <div className="flex flex-col gap-6 md:gap-14">
          {FICHAS_DE_MATERIAL.map(ficha => (
            <MaterialFicha
              key={ficha.kind}
              ficha={ficha}
              compacta={compacta}
              aberta={abertas.includes(ficha.kind)}
              onAlternar={() => alternar(ficha.kind)}
              onVerVideo={onVerVideo}
            />
          ))}

          <SimpleMaterialCards />
        </div>
      </div>
    </GuideSection>
  )
}

export default MaterialsSection
