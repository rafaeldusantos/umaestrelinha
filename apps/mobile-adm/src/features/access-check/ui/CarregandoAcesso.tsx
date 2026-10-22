import { Splash } from '@/features/splash'
import TelaDeEntrada from '@/shared/ui/TelaDeEntrada'
import { useTentativaEmCurso } from '../model/tentativa'
import AcessoNaoConferido from './AcessoNaoConferido'

/**
 * O `fallback` do `RequireAdmin` no ateliê: a splash na abertura e nos carregamentos, e a tela de
 * "Não consegui conferir seu acesso." com o botão em "Conferindo…" quando quem carrega é uma nova
 * tentativa pedida nela. Sem isto, tocar "Tentar de novo" trocava a tela pela splash por até 8 s.
 */
const CarregandoAcesso = () =>
  useTentativaEmCurso() ? (
    <TelaDeEntrada>
      <AcessoNaoConferido />
    </TelaDeEntrada>
  ) : (
    <Splash />
  )

export default CarregandoAcesso
