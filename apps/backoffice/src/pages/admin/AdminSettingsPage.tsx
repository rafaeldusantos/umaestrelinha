// `/admin/configuracoes` — feature 55.
//
// ## O que ela era
//
// Oito abas horizontais dentro de um `<Tabs>` só, com ~430 linhas de formulário escritas à mão, seis
// `useState`, e um `save()` de seis ramos. O `TabsList` já levava um remendo de CSS
// (`h-auto grid-cols-3 sm:grid-cols-8`) documentado no próprio código como conserto local, porque em
// 390px as três linhas de abas eram cortadas pelo `h-10` fixo do componente compartilhado. A nona
// aba não caberia sem repetir o remendo — a contagem estava na classe.
//
// ## O que ela é
//
// **Quatro seções com endereço próprio**, um rail à esquerda, e uma página que não sabe desenhar
// formulário nenhum: ela lê a URL, escolhe a seção e monta o painel dela.
//
// Três donos, e nenhum decide o que é do outro:
//
// | Pergunta | Dono |
// | --- | --- |
// | Quais seções existem | `SETTINGS_SECTIONS` (`shared/lib`) |
// | Qual está aberta | a **URL** |
// | O que cada uma desenha | `SETTINGS_PANELS` (`widgets/settings-sections`) |
//
// ## As duas alternâncias, que são de naturezas diferentes
//
// **Qual seção está montada é decidido pela URL, com montagem CONDICIONAL** — o painel renderiza só
// o componente da seção ativa, e as outras três não existem no DOM. Isso não é economia: é o que
// mantém verdadeiro "trocar de seção descarta a edição não salva". Quem garantia isso até aqui era o
// Radix, que desmonta `TabsContent` inativo, e a `NotificationsTab` **depende disso por escrito**
// (o comentário no topo dela diz que o rascunho volta ao servidor porque o componente remonta).
// Esconder as quatro seções com CSS manteria os quatro rascunhos vivos, a prévia de e-mail aberta
// vazaria entre seções, e nada quebraria.
//
// **Desktop × celular é decidido pelo BREAKPOINT, numa árvore só.** Não há uma versão de cada: o
// rail e a lista do celular são o mesmo nó (`SettingsSectionNav`), e o que muda é classe `lg:`. Duas
// árvores paralelas seriam duas listas das mesmas quatro seções — o "defeito 01" —, e divergiriam na
// quinta.

import { useNavigate, useParams } from 'react-router-dom'
import { Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import { PageHeader } from '@/shared/ui'
import { SETTINGS_PANELS, SettingsSectionNav } from '@/widgets/settings-sections'
import {
  SETTINGS_ROOT,
  SETTINGS_SECTIONS,
  findSettingsSection,
} from '@/shared/lib/settingsSections'

const AdminSettingsPage = () => {
  const { secao } = useParams<{ secao: string }>()
  const navigate = useNavigate()

  /**
   * As duas derivações, e cada uma responde a uma pergunta diferente.
   *
   * `secaoValida` é `null` na rota-mãe **e** no slug inexistente (`CFG-18`, cujo recorte mora em
   * `findSettingsSection`, num lugar só). Ela decide se o celular mostra a lista ou a seção, e se o
   * cabeçalho de voltar existe.
   *
   * `secaoExibida` nunca é nula. Ela decide o que o painel desenha e o que o rail marca — e é por
   * isso que a rota-mãe abre em "Dados da loja" com ela marcada (`CFG-02`), em vez de um índice no
   * painel: o rail já é a lista, e repeti-la ao lado seria a mesma lista duas vezes na mesma tela.
   */
  const secaoValida = findSettingsSection(secao)
  const secaoExibida = secaoValida ?? SETTINGS_SECTIONS[0]

  const Painel = SETTINGS_PANELS[secaoExibida.slug]

  return (
    <div>
      {/* O cabeçalho de voltar é do celular, e só existe dentro de uma seção. No desktop a seção
          abre ao lado do rail, então não há para onde "voltar" — a lista está à vista.

          É o `PageHeader` com `backTo`, e não um cabeçalho novo: a prop existe na interface dele
          desde sempre e **nunca teve consumidor**. Inventar um segundo cabeçalho de página para
          ganhar o sobrescrito "CONFIGURAÇÕES" do artboard seria um segundo dono de cabeçalho — a
          descrição da seção abaixo do título diz a mesma coisa com o componente que já existe.

          Ele **sobe** para a rota-mãe em vez de `navigate(-1)`: quem chegou por link colado não tem
          "anterior", e voltar o levaria para fora do painel. O botão do navegador continua fazendo o
          que sempre faz, e no percurso normal os dois levam à lista (`CFG-12`). */}
      {secaoValida && (
        <PageHeader
          className="lg:hidden"
          backTo={() => navigate(SETTINGS_ROOT)}
          title={secaoValida.label}
          subtitle={secaoValida.description}
        />
      )}

      {/* `CFG-08` — o cabeçalho é o MESMO nó em todas as seções. Ele fica fora do painel de
          propósito: dentro dele, trocar de seção o remontaria, e o título piscaria a cada clique. */}
      <PageHeader
        className={cn(secaoValida && 'hidden lg:flex')}
        icon={SettingsIcon}
        title="Configurações"
        subtitle="O que muda o funcionamento da loja — frete, pagamento, notificações e mais."
      />

      <div className="lg:flex lg:items-start lg:gap-6">
        <SettingsSectionNav
          ativa={secaoExibida.slug}
          className={cn(secaoValida && 'hidden lg:block')}
        />

        {/* `max-w-3xl` é a medida de leitura que a tela já tinha antes desta feature: os campos
            mantêm a largura de sempre, e o painel não estica até a borda num monitor largo. */}
        <div
          data-testid="settings-panel"
          className={cn(
            'w-full min-w-0 max-w-3xl lg:flex-1',
            // Na rota-mãe o celular mostra SÓ a lista (`CFG-10`). O painel existe no DOM porque o
            // desktop o está mostrando — é a mesma árvore.
            !secaoValida && 'hidden lg:block',
          )}
        >
          <Painel />
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsPage
