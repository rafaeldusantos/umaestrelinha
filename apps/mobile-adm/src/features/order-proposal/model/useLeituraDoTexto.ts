import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeCep, type CustomerParseMode, type ParsedAddress, type ParsedContact } from '@estrelinha/core/customers'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { useCepLookup } from '@estrelinha/core/hooks/useCepLookup'

import { lerTextoDaConversa } from '../api/portaDeLeitura'
import { LEITURAS_DEMAIS, LEITURA_FORA_DO_AR, SEM_DADOS_NO_TEXTO } from './frasesDaMontagem'
import { cepCompleto, type LeituraRecebida } from './montagem'

export interface LeituraDoTexto {
  /** A leitura está no ar (a function, e depois o serviço de CEP): "Lendo o texto…". */
  lendo: boolean
  /** A frase do desfecho que não preencheu nada — a folha fica aberta com ela. */
  erro: string | null
  /** A recusa (`42501`) que a porta lançou — a página a entrega à MESMA vigia da leitura. */
  erroBruto: unknown
  ler: (texto: string, escopo: CustomerParseMode) => Promise<void>
  /** Esquece o desfecho anterior (a folha abriu de novo). */
  limpar: () => void
  /**
   * Desiste da leitura no ar (a folha fechou): solta a trava e "Lendo o texto…", e o que voltar
   * depois — campos ou frase — é descartado. Só a recusa (`42501`) ainda chega à vigia.
   */
  cancelar: () => void
}

interface Pendente {
  escopo: CustomerParseMode
  contato: ParsedContact | null
  endereco: ParsedAddress
}

/** Os desfechos sem campo nenhum: 422 é leitura que não deu em nada (recusada, cortada, fora da forma). */
const fraseDoErro = (slug: string): string =>
  slug === 'limited' ? LEITURAS_DEMAIS : slug === 'refusal' || slug === 'truncated' || slug === 'invalid' ? SEM_DADOS_NO_TEXTO : LEITURA_FORA_DO_AR

/**
 * A leitura de um texto colado, pela porta `customer-parse`, e o "O CEP manda": com um CEP de 8 dígitos
 * no que foi lido, a leitura espera o MESMO serviço de CEP da montagem (`useCepLookup`, a mesma chave
 * de cache do formulário) e junta as duas respostas por `mergeCep` (`core`). Sem resposta do serviço,
 * fica o que o texto trouxe.
 *
 * Nada é gravado: quem recebe o resultado (`aoLer`) só preenche a memória da tela. O texto vive na
 * chamada e em mais nenhum lugar.
 */
export const useLeituraDoTexto = (aoLer: (lida: LeituraRecebida) => void): LeituraDoTexto => {
  const trava = useRef(false)
  /** A leitura vigente: cada `ler` e cada `cancelar` a renovam, e a resposta de uma vencida não entra. */
  const vez = useRef(0)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroBruto, setErroBruto] = useState<unknown>(null)
  const [pendente, setPendente] = useState<Pendente | null>(null)
  const atual = useRef(aoLer)
  atual.current = aoLer

  const cepPendente = pendente && cepCompleto(pendente.endereco.cep) ? pendente.endereco.cep : null
  const cep = useCepLookup(cepPendente)

  useEffect(() => {
    if (!pendente) return
    if (cepPendente && !cep.data) return
    const { address, fromCep } = mergeCep(pendente.endereco, cepPendente ? (cep.data ?? null) : null)
    setPendente(null)
    trava.current = false
    setLendo(false)
    atual.current({ escopo: pendente.escopo, contato: pendente.contato, endereco: address, conferidos: fromCep })
  }, [pendente, cepPendente, cep.data])

  const terminarSemCampos = (frase: string) => {
    trava.current = false
    setLendo(false)
    setErro(frase)
  }

  const ler = useCallback(async (texto: string, escopo: CustomerParseMode) => {
    if (trava.current || texto.trim() === '') return
    trava.current = true
    const minha = ++vez.current
    setLendo(true)
    setErro(null)
    let r: Awaited<ReturnType<typeof lerTextoDaConversa>>
    try {
      r = await lerTextoDaConversa(texto, escopo)
    } catch (e) {
      if (isAccessDenied(e)) {
        if (minha === vez.current) {
          trava.current = false
          setLendo(false)
        }
        setErroBruto(e)
        return
      }
      if (minha !== vez.current) return
      return terminarSemCampos(LEITURA_FORA_DO_AR)
    }
    if (minha !== vez.current) return
    if (r.tipo === 'falhou') return terminarSemCampos(LEITURA_FORA_DO_AR)
    if (r.tipo === 'erro') return terminarSemCampos(fraseDoErro(r.slug))
    if (r.dado.encontrados === 0) return terminarSemCampos(SEM_DADOS_NO_TEXTO)
    setPendente({ escopo, contato: escopo === 'address' ? null : r.dado.contact, endereco: r.dado.address })
  }, [])

  const limpar = useCallback(() => setErro(null), [])

  const cancelar = useCallback(() => {
    vez.current += 1
    trava.current = false
    setPendente(null)
    setLendo(false)
    setErro(null)
  }, [])

  return { lendo, erro, erroBruto, ler, limpar, cancelar }
}
