// Seção **Frete e Material** — feature 55.
//
// As duas remessas da loja, que sempre foram vizinhas e nunca foram a mesma coisa: a joia que SAI
// daqui (cotação, frete grátis) e o material afetivo que CHEGA (o endereço do ateliê). Como abas
// separadas, a dona precisava lembrar em qual das duas estava o endereço — e são as duas únicas
// telas do painel que falam de pacote no correio.

import { useEffect, useState } from 'react'
import { PackageOpen } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { freeShippingRefusal } from '@estrelinha/core/shipping'
import {
  DEFAULT_MATERIAL,
  DEFAULT_SHIPPING,
  type MaterialSettings,
  type ShippingSettings,
} from '@estrelinha/supabase/types/settings'
import { FormCard, FieldGroup, InfoBanner, MoneyInput, SWITCH_TAP_44, ToggleField } from '@/shared/ui'
import { useSettingsSave } from '../model/useSettingsSave'
import { SettingsLoading, SettingsSaveButton } from './settingsParts'

export const ShippingMaterialSection = () => {
  const { data, isLoading } = useStoreSettings()
  const { salvar, salvando } = useSettingsSave()
  const { toast } = useToast()

  const [shipping, setShipping] = useState<ShippingSettings>(DEFAULT_SHIPPING)
  const [material, setMaterial] = useState<MaterialSettings>(DEFAULT_MATERIAL)

  useEffect(() => {
    if (!data) return
    setShipping(data.shipping)
    setMaterial(data.material)
  }, [data])

  /**
   * `FRG-12` — recusa "ligado, a partir de R$ 0" **antes** de qualquer escrita.
   *
   * Sem esta guarda o painel exibiria "frete grátis ligado" enquanto a loja se comporta como
   * desligada (`freeShippingState` trata faixa ≤ 0 como inativa). Divergência silenciosa entre o que
   * a dona lê e o que a cliente vive é a família de defeito que a feature 37 existe para fechar —
   * deixá-la entrar pela porta do editor seria trocar um segundo dono por outro.
   *
   * O veredito é `string | null`, e não união discriminada por booleano: com
   * `strictNullChecks: false` aquela forma não estreita. Mesmo formato de `reservedSlugRefusal`.
   */
  const salvarFrete = () => {
    const motivo = freeShippingRefusal(shipping)
    if (motivo) {
      toast({ title: 'Frete grátis sem valor mínimo', description: motivo, variant: 'destructive' })
      return
    }
    void salvar('shipping', shipping)
  }

  if (isLoading) return <SettingsLoading />

  return (
    <div className="space-y-6">
      <FormCard title="Frete" description="O que a cliente paga para receber a joia pronta">
        {/*
          FRG-02 — o interruptor do frete grátis.

          Antes da feature 37 só existia o campo do valor, e zerá-lo era a única saída aparente para
          desligar o benefício. Não desligava: três superfícies da loja liam o zero como "não temos
          frete grátis" e escondiam o texto, enquanto quatro faziam `subtotal >= 0` — sempre
          verdadeiro — e ZERAVAM O FRETE. Zerar o campo escondia o anúncio e liberava frete grátis
          para todo mundo no caixa.

          O campo do valor fica DESABILITADO e não escondido: a Adri precisa ver o número que está
          guardado para decidir se quer religar com ele. Desligar não apaga a configuração.
        */}
        <ToggleField
          label="Oferecer frete grátis"
          description="Quando desligado, a loja não anuncia frete grátis em nenhuma tela e o frete é cobrado normalmente. Cupons de frete grátis continuam valendo."
          checked={shipping.free_shipping_enabled}
          onChange={v => setShipping({ ...shipping, free_shipping_enabled: v })}
          switchClassName={SWITCH_TAP_44}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/*
            Os rótulos perderam o `(R$)` (`CFG-25`): o prefixo do `MoneyInput` carrega a unidade, e
            dizê-la duas vezes na mesma linha é ruído. É a convenção já em uso no `PricingTab`.

            `v ?? 0` é o que mantém `CFG-24` verdadeiro: o campo cru gravava `Number(…) || 0`, então
            esvaziá-lo sempre gravou zero. `MoneyInput` emite `null` para campo vazio, e propagar
            esse `null` mudaria o dado gravado sem que nenhuma AC peça — um `null` em
            `free_shipping_threshold` faria a loja comparar `subtotal >= null`.
          */}
          <FieldGroup
            label="Frete grátis a partir de"
            htmlFor="free-shipping-threshold"
            hint={
              shipping.free_shipping_enabled
                ? undefined
                : 'Guardado. Volta a valer quando você ligar o frete grátis.'
            }
          >
            <MoneyInput
              id="free-shipping-threshold"
              disabled={!shipping.free_shipping_enabled}
              value={shipping.free_shipping_threshold}
              onChange={v => setShipping({ ...shipping, free_shipping_threshold: v ?? 0 })}
            />
          </FieldGroup>

          <FieldGroup
            label="Custo de frete padrão"
            htmlFor="default-shipping-cost"
            hint="Usado como fallback quando o cálculo não está disponível."
          >
            <MoneyInput
              id="default-shipping-cost"
              value={shipping.default_shipping_cost}
              onChange={v => setShipping({ ...shipping, default_shipping_cost: v ?? 0 })}
            />
          </FieldGroup>
        </div>

        {/*
          O campo "CEP de origem" saiu daqui em 2026-09-05, e a remoção é o conserto — não uma
          simplificação.

          Ele era editável e **nenhum arquivo o lia**. A origem da cotação sempre veio do
          `postal_code` do secret `MELHOR_ENVIO_SENDER_JSON`, que é o mesmo endereço impresso na
          etiqueta. Preencher o campo aqui não mudava um centavo, e o tipo em
          `packages/supabase/src/types/settings.ts` ainda afirmava que ele era a origem — dois donos,
          um deles morto e o outro documentado errado.

          Por que o dono único é o secret, e não este campo: a etiqueta precisa do endereço por
          extenso, com CPF e telefone, e isso não cabe (nem deve caber) numa linha de
          `store_settings` legível por quem tiver acesso ao painel. Se o CEP fosse configurável aqui,
          a origem da COTAÇÃO e a origem da ETIQUETA passariam a poder divergir — a loja cotaria de
          um lugar e postaria de outro, sem nada em tela dizendo por quê.

          A chave continua no banco (migration aplicada é imutável) e em `DEFAULT_SHIPPING`;
          `originZipNotRead.test.ts` impede que alguma tela volte a lê-la.
        */}
        <p className="text-sm text-muted-foreground">
          O CEP de origem dos cálculos é o endereço cadastrado na sua conta do Melhor Envio — o mesmo
          que é impresso na etiqueta. Para alterá-lo, mude o endereço lá.
        </p>

        <SettingsSaveButton testId="salvar-frete" loading={salvando} onClick={salvarFrete} />
      </FormCard>

      {/*
        MATERIAL — para onde a cliente posta o material afetivo.

        Fica aqui, e não no código, porque mudar de endereço é operação da dona; com o endereço em
        `.tsx` ela viraria um deploy. E é OUTRA remessa: a origem da cotação do Melhor Envio
        (ateliê → cliente) vem do secret `MELHOR_ENVIO_SENDER_JSON`; esta é a chegada
        (cliente → ateliê), e precisa do endereço por extenso para caber numa etiqueta escrita à mão.

        Enquanto o logradouro estiver vazio, a página "Como enviar" NÃO mostra endereço nenhum —
        mostra o convite a falar pela loja. Endereço pela metade é material insubstituível postado
        para lugar nenhum, e não há segunda via.
      */}
      <FormCard
        title="Material"
        description="Endereço para onde a cliente envia cinzas, cabelo ou leite materno"
      >
        <InfoBanner icon={PackageOpen} data-testid="aviso-endereco-material">
          <p>
            Este endereço aparece na página <strong>Como enviar o material</strong>. Enquanto o
            logradouro estiver vazio, a loja não mostra endereço nenhum — pede que a cliente combine
            o envio com você.
          </p>
        </InfoBanner>

        <FieldGroup
          label="Destinatário" htmlFor="material-destinatario"
          hint="A quem endereçar o envelope. Sem isto a cliente escreve só o nome da loja."
        >
          <Input id="material-destinatario"
            value={material.recipient}
            onChange={e => setMaterial({ ...material, recipient: e.target.value })}
            placeholder="Adri Muniz"
          />
        </FieldGroup>

        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <FieldGroup label="Logradouro" htmlFor="material-logradouro">
            <Input id="material-logradouro"
              value={material.street}
              onChange={e => setMaterial({ ...material, street: e.target.value })}
              placeholder="Rua …"
            />
          </FieldGroup>
          <FieldGroup label="Número" htmlFor="material-numero">
            <Input id="material-numero"
              value={material.number}
              onChange={e => setMaterial({ ...material, number: e.target.value })}
            />
          </FieldGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="Complemento" htmlFor="material-complemento">
            <Input id="material-complemento"
              value={material.complement}
              onChange={e => setMaterial({ ...material, complement: e.target.value })}
              placeholder="Apto, sala, referência"
            />
          </FieldGroup>
          <FieldGroup label="Bairro" htmlFor="material-bairro">
            <Input id="material-bairro"
              value={material.neighborhood}
              onChange={e => setMaterial({ ...material, neighborhood: e.target.value })}
            />
          </FieldGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_100px_160px]">
          <FieldGroup label="Cidade" htmlFor="material-cidade">
            <Input id="material-cidade"
              value={material.city}
              onChange={e => setMaterial({ ...material, city: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="UF" htmlFor="material-uf">
            <Input id="material-uf"
              value={material.state}
              onChange={e =>
                setMaterial({ ...material, state: e.target.value.toUpperCase().slice(0, 2) })
              }
              placeholder="RS"
            />
          </FieldGroup>
          <FieldGroup label="CEP" htmlFor="material-cep">
            <Input id="material-cep"
              value={material.zip}
              onChange={e =>
                setMaterial({ ...material, zip: e.target.value.replace(/\D/g, '').slice(0, 8) })
              }
              placeholder="00000000"
            />
          </FieldGroup>
        </div>

        <FieldGroup
          label="Observação para quem envia" htmlFor="material-observacao"
          hint="Aparece junto do endereço. Ex.: horário de recebimento, como embalar."
        >
          <Textarea id="material-observacao"
            value={material.notes}
            rows={3}
            maxLength={400}
            onChange={e => setMaterial({ ...material, notes: e.target.value })}
          />
        </FieldGroup>

        <SettingsSaveButton
          testId="salvar-material"
          loading={salvando}
          onClick={() => void salvar('material', material)}
        />
      </FormCard>
    </div>
  )
}

export default ShippingMaterialSection
