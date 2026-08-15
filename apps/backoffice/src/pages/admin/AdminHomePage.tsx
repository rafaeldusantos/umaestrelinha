// A tela onde a composição da Home é decidida (feature 24).
//
// A Home já era dinâmica — as fileiras saem de `categories` por `sort_order`, a grade de banners de
// quem tem `banner_url`, os números da faixa de vantagens de `store_settings`. O que ainda estava
// cravado no `.tsx` era a **composição**: quais seções existem, em que ordem, com que texto e com
// que limite. É isso que esta tela edita.

import { House } from 'lucide-react'
import { PageHeader } from '@/shared/ui'

const AdminHomePage = () => (
  <div>
    <PageHeader
      title="Home"
      subtitle="O que a cliente vê ao abrir a loja, na ordem em que ela vê."
      icon={House}
    />
  </div>
)

export default AdminHomePage
