import { useEffect, useRef } from 'react'
import { useCepLookup } from '@estrelinha/core/hooks/useCepLookup'
import { maskCep, stripCep } from '@estrelinha/core/validators'

import { cepCompleto, type EnderecoDigitado } from '../model/montagem'
import Campo from './CampoDaMontagem'
import { DICA_CEP_NAO_ACHADO, SALVAR_NO_CADASTRO, SO_GRAVA_AO_CRIAR, dicaCepAchado } from '../model/frasesDaMontagem'

/**
 * O endereço de entrega da montagem: CEP, rua, número + complemento, bairro e
 * cidade + UF, e o interruptor "Salvar no cadastro da cliente" (ligado; só é gravado quando o link for
 * criado).
 *
 * O CEP manda: com 8 dígitos, o MESMO serviço de CEP da loja e do painel (`useCepLookup`, `core`)
 * completa rua, bairro, cidade e UF. Até ele responder, esses quatro ficam travados; o serviço que não
 * conhece o CEP — ou que está fora do ar, sem distinguir os dois — os libera para digitar, e a
 * tela diz que não achou. Número e complemento são sempre da Adri.
 */
export interface FormularioDeEnderecoProps {
  prefixo: string
  endereco: EnderecoDigitado
  aoMudar: (campos: Partial<EnderecoDigitado>) => void
  salvarNoCadastro: boolean
  aoTrocarSalvar: (valor: boolean) => void
}

const FormularioDeEndereco = ({ prefixo, endereco, aoMudar, salvarNoCadastro, aoTrocarSalvar }: FormularioDeEnderecoProps) => {
  const completo = cepCompleto(endereco.cep)
  const cep = useCepLookup(completo ? endereco.cep : null)
  const resposta = completo ? cep.data : undefined
  const aplicado = useRef<string | null>(null)
  const atual = useRef(aoMudar)
  atual.current = aoMudar

  useEffect(() => {
    if (!resposta || resposta.manual) return
    const digitos = stripCep(endereco.cep)
    if (aplicado.current === digitos) return
    aplicado.current = digitos
    atual.current({ rua: resposta.street, bairro: resposta.neighborhood, cidade: resposta.city, uf: resposta.state })
  }, [resposta, endereco.cep])

  const travado = !completo || !resposta
  const id = (c: string) => `${prefixo}-${c}`

  return (
    <div className="space-y-3">
      <Campo
        id={id('cep')}
        rotulo="CEP"
        valor={endereco.cep}
        placeholder="00000-000"
        inputMode="numeric"
        autoComplete="postal-code"
        aoMudar={(v) => aoMudar({ cep: maskCep(v) })}
      />
      {completo && cep.isFetching && !resposta && (
        <p role="status" className="text-sm text-estrelinha-ink-soft">
          Procurando o CEP…
        </p>
      )}
      {resposta && !resposta.manual && (
        <p role="status" className="text-sm text-estrelinha-ink-soft">
          {dicaCepAchado(resposta.city, resposta.state)}
        </p>
      )}
      {resposta?.manual && (
        <p role="status" className="text-sm text-estrelinha-ink">
          {DICA_CEP_NAO_ACHADO}
        </p>
      )}
      <Campo id={id('rua')} rotulo="Rua" valor={endereco.rua} travado={travado} autoComplete="address-line1" aoMudar={(v) => aoMudar({ rua: v })} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3">
        <Campo id={id('numero')} rotulo="Número" valor={endereco.numero} aoMudar={(v) => aoMudar({ numero: v })} />
        <Campo
          id={id('complemento')}
          rotulo="Complemento"
          dica="Opcional"
          valor={endereco.complemento}
          aoMudar={(v) => aoMudar({ complemento: v })}
        />
      </div>
      <Campo id={id('bairro')} rotulo="Bairro" valor={endereco.bairro} travado={travado} aoMudar={(v) => aoMudar({ bairro: v })} />
      <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3">
        <Campo id={id('cidade')} rotulo="Cidade" valor={endereco.cidade} travado={travado} aoMudar={(v) => aoMudar({ cidade: v })} />
        <Campo
          id={id('uf')}
          rotulo="UF"
          valor={endereco.uf}
          travado={travado}
          aoMudar={(v) => aoMudar({ uf: v.toUpperCase().slice(0, 2) })}
        />
      </div>
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md bg-estrelinha-ground-deep px-3 py-2">
        <span className="min-w-0 flex-1 break-words">
          <span className="block text-base text-estrelinha-ink">{SALVAR_NO_CADASTRO}</span>
          <span className="block text-sm text-estrelinha-ink-soft">{SO_GRAVA_AO_CRIAR}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={salvarNoCadastro}
          onChange={(e) => aoTrocarSalvar(e.target.checked)}
        />
        <span
          aria-hidden="true"
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-estrelinha-field peer-checked:bg-estrelinha-primary peer-focus-visible:ring-2 peer-focus-visible:ring-estrelinha-primary peer-focus-visible:ring-offset-2"
        >
          <span className={`block h-5 w-5 rounded-full bg-estrelinha-surface shadow-sm ${salvarNoCadastro ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </span>
      </label>
    </div>
  )
}

export default FormularioDeEndereco
