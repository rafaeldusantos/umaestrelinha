import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { ACCESS_UNCHECKED } from '@estrelinha/core/auth'
import { BOTAO_PRIMARIO } from '@/shared/ui/campo'
import { tentarDeNovo, useTentativaEmCurso } from '../model/tentativa'

/**
 * O papel não pôde ser conferido (feature 72, `MAF-23`, fecha a `BL-048`): a consulta falhou ou não
 * respondeu no teto do `AuthProvider`. É "não sei", e a tela diz isso.
 *
 * - **Nunca a recusa** ("Esta conta não tem acesso ao painel."): a conta pode ser admin, e a frase
 *   confiante e falsa era o defeito.
 * - **Nunca "Sair"**: sair apagaria a sessão salva, e a Adri passaria a precisar da senha depois que
 *   a internet voltasse. A única ação é "Tentar de novo", que refaz a leitura da sessão e do papel.
 *
 * Desenhada pelo Login e pelo `unknownFallback` do `RequireAdmin` (`App.tsx`).
 */
const AcessoNaoConferido = () => {
  const { retryAdminCheck, loading } = useAuthContext()
  const conferindo = useTentativaEmCurso() || loading

  return (
    <section className="mt-8 space-y-6">
      <div role="alert" className="space-y-2">
        <h1 className="text-2xl">{ACCESS_UNCHECKED}</h1>
        <p className="text-sm text-estrelinha-ink-soft">Confira a internet do celular e tente de novo. Sua sessão continua salva.</p>
      </div>
      <Button type="button" onClick={() => void tentarDeNovo(retryAdminCheck)} disabled={conferindo} className={BOTAO_PRIMARIO}>
        {conferindo ? 'Conferindo…' : 'Tentar de novo'}
      </Button>
    </section>
  )
}

export default AcessoNaoConferido
