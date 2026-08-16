// Feature 31 — o guia de material, redesenhado a partir dos artboards `5MC-0` (desktop) e `6AU-0`
// (mobile).
//
// Esta é a página que separa a loja de um catálogo qualquer: a cliente precisa enviar pelo correio um
// material insubstituível — cinzas de cremação, leite materno, um cacho de cabelo, o primeiro dente
// do filho —, e se ele se perde não existe segunda via. O tom não é escolha de marketing, é restrição
// de produto (`CLAUDE.md`): quem lê acabou de perder alguém. Instrução clara, nada de linguagem
// festiva, nada de urgência fabricada.
//
// **A página não desenha nada.** Ela resolve três coisas e delega o resto ao slice
// `widgets/material-guide`: a canônica, o viewport (que decide se as fichas são acordeão) e qual
// vídeo está aberto. Foi assim que a versão anterior desta página cresceu para 160 linhas de JSX com
// o conteúdo cravado no meio — e a âncora de cada material, que é contrato com a página do produto,
// virou coisa que só se conferia lendo.
//
// **A rota antiga (`/como-enviar-o-material`) responde 301 para cá**, no edge e no espelho do router:
// aquela URL está no rodapé de e-mail já enviado e é a que a Adri manda por WhatsApp desde a feature
// 22. Ver `LEGACY_REDIRECTS` em `@estrelinha/core/routes`.

import { useState } from 'react'
import { useCanonical } from '@/shared/lib/useCanonical'
import { useCompactViewport } from '@/shared/lib/useCompactViewport'
import {
  GUIA_MATERIAL_PATH,
  GuideChecklist,
  GuideHero,
  GuideSteps,
  GuideWhatsAppCta,
  HomePrepSection,
  MaterialsSection,
  ShippingSection,
  VIDEOS_DE_PREPARO,
  VideoGallery,
  VideoLightbox,
} from '@/widgets/material-guide'

/** O caminho canônico. Reexportado do slice para quem já importava a constante desta página. */
export const HOW_TO_SEND_PATH = GUIA_MATERIAL_PATH

const HowToSendMaterialPage = () => {
  useCanonical(HOW_TO_SEND_PATH)

  // Resolvido UMA vez e distribuído: sete fichas assinando `matchMedia` por conta própria seriam sete
  // ouvintes do mesmo evento, e a página remontaria sete vezes ao girar o celular.
  const compacta = useCompactViewport()

  // O vídeo aberto, por id — e não o objeto, para o botão da ficha e o cartão da galeria abrirem o
  // mesmo diálogo passando a mesma coisa.
  const [videoAberto, setVideoAberto] = useState<string | null>(null)
  const video = VIDEOS_DE_PREPARO.find(item => item.id === videoAberto) ?? null

  return (
    <>
      {/*
        A ordem é a dos artboards, e ela tem lógica: os vídeos vêm ANTES das fichas. Quem chega
        inseguro assiste primeiro e lê depois; quem já sabe o que faz rola direto para a ficha pelos
        atalhos. Inverter poria o texto denso na frente de quem menos consegue lê-lo agora.
      */}
      <GuideHero />
      <GuideSteps />
      <VideoGallery onAbrir={setVideoAberto} />
      <MaterialsSection compacta={compacta} onVerVideo={setVideoAberto} />
      <HomePrepSection />
      <ShippingSection />
      <GuideChecklist />
      <GuideWhatsAppCta />

      <VideoLightbox video={video} onOpenChange={aberto => !aberto && setVideoAberto(null)} />
    </>
  )
}

export default HowToSendMaterialPage
