import { Play } from 'lucide-react'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import { ATALHOS_DE_MATERIAL } from '../model/guide'

/**
 * "Encontre o seu material" — os hiperlinks por material (`5MC-0` chips, `6AU-0` grade).
 *
 * São **âncoras da própria página**, não rotas: a cliente já está onde precisa estar, e o que falta é
 * chegar ao trecho dela. Link de verdade (`<a href="#...">`) e não `scrollIntoView` num `onClick`,
 * porque assim o endereço fica na barra, sobrevive ao F5, pode ser copiado para o WhatsApp — que é
 * exatamente o uso: a Adri manda "olha o item das cinzas".
 *
 * Pílula é a forma certa aqui, e não uma exceção: são **rótulos que nomeiam material**, a mesma
 * espécie dos chips de `MaterialNotice` na página do produto, que a allowlist de `buttonShape` já
 * descreve. A cliente reconhece o mesmo objeto nas duas telas.
 *
 * O triângulo marca as três fichas que têm vídeo e passos ilustrados; as demais são entradas curtas.
 * Sem o marcador, oito pílulas idênticas prometeriam a mesma profundidade em todas.
 */
const MaterialShortcuts = () => (
  <nav aria-label="Atalhos por material">
    <ul className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap md:items-center md:gap-3">
      {ATALHOS_DE_MATERIAL.map(atalho => (
        <li key={atalho.anchor} className="min-w-0">
          <a
            href={`#${atalho.anchor}`}
            className={`${TAP_ROW} flex w-full items-center justify-center gap-2 rounded-pill px-4 py-3 text-center text-[14px] font-medium transition-colors md:w-auto md:px-5 md:text-[17px] ${
              atalho.destaque
                ? 'bg-estrelinha-ground-deep text-estrelinha-ink hover:bg-estrelinha-serenity'
                : 'border border-estrelinha-line text-estrelinha-ink-soft hover:border-estrelinha-field hover:text-estrelinha-ink'
            }`}
          >
            {atalho.destaque && (
              <Play
                className="h-3 w-3 shrink-0 fill-estrelinha-accent-strong text-estrelinha-accent-strong"
                aria-hidden
              />
            )}
            <span className="min-w-0 truncate">{atalho.rotulo}</span>
          </a>
        </li>
      ))}
    </ul>
  </nav>
)

export default MaterialShortcuts
