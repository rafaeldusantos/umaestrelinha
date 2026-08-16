import { Check } from 'lucide-react'
import { CHECKLIST_DO_ENVIO } from '../model/guide'
import GuideHeading from './GuideHeading'
import GuideSection from './GuideSection'

/**
 * "Antes de fechar a caixa" (`5MC-0`) — as seis conferidas finais.
 *
 * **Não é formulário.** As caixas são desenho, não `<input type="checkbox">`: marcar aqui não guarda
 * estado em lugar nenhum, e um controle que esquece o que a cliente marcou é pior do que nenhum
 * controle — ela fecharia a caixa confiando numa memória que a página não tem. O que a lista faz é
 * dar a ordem da conferência, e para isso `<ul>` basta.
 */
const GuideChecklist = () => (
  <GuideSection tone="ground-deep" labelledBy="guia-checklist">
    <div className="flex flex-col gap-8 rounded-lg bg-white p-6 md:gap-10 md:p-14">
      <GuideHeading
        id="guia-checklist"
        versalete="Última conferida"
        titulo="Antes de fechar a caixa"
        apoio="Seis conferidas rápidas que evitam quase todos os problemas de envio."
        apoioAoLado
      />

      <ul className="grid gap-0 md:grid-cols-2 md:gap-x-12">
        {CHECKLIST_DO_ENVIO.map((item, indice) => (
          <li
            key={item}
            className={`flex items-center gap-3.5 py-4 md:py-0 md:pb-[22px] ${
              // As duas últimas fecham a coluna no desktop e não levam fio; no mobile, só a última.
              indice < CHECKLIST_DO_ENVIO.length - 1 ? 'border-b border-estrelinha-line' : ''
            } ${indice >= CHECKLIST_DO_ENVIO.length - 2 ? 'md:border-b-0 md:pb-0' : ''}`}
          >
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-estrelinha-accent"
            >
              <Check className="h-3.5 w-3.5 text-estrelinha-accent-strong" strokeWidth={2.4} />
            </span>
            <span className="text-[16px] font-light leading-[26px] text-estrelinha-ink md:text-[17px]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </GuideSection>
)

export default GuideChecklist
