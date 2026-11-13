// O editor do bloco "Joias em oferta".
//
// O bloco não tem campo nenhum, e é decisão: o rótulo, o título e os percentuais vêm da
// campanha de desconto em vigência. Um campo de título aqui seria um segundo dono do nome da
// campanha — a Home diria uma coisa e o selo da peça outra. O que este editor faz é dizer isso e
// apontar para onde a campanha se edita.

import { Link } from 'react-router-dom'
import { FormCard } from '@/shared/ui'

const CampaignOffersEditor = () => (
  <FormCard title="De onde vem o conteúdo">
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        Este bloco não tem campos. O rótulo, o título e os percentuais vêm da campanha de desconto em
        vigência, e cada percentual leva às peças com aquele desconto.
      </p>
      <p>
        Sem campanha em vigência, o bloco não aparece na loja. A campanha se edita em{' '}
        <Link to="/admin/campanhas" className="font-medium text-primary underline">
          Campanhas
        </Link>
        .
      </p>
    </div>
  </FormCard>
)

export default CampaignOffersEditor
