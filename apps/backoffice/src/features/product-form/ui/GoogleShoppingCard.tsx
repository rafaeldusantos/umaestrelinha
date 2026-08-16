// Feature 30 · GSH-19, GSH-20 — os identificadores que o feed do Google Shopping emite por produto.
//
// **Mora na aba SEO, e não numa aba nova.** A aba já é "como este produto é descrito para fora"; uma
// aba própria custaria um teste de abas e não diria nada a mais.
//
// Os campos são os mesmos que o painel da Nuvemshop expõe hoje na seção *Instagram e Google
// Shopping* — marca, MPN, faixa etária e sexo —, mais os dois que o feed precisa decidir: a
// taxonomia do Google e a existência de identificador.
//
// **`age_group` e `gender` são escolha fechada, nunca texto livre.** O vocabulário é do Google, e
// texto livre faria a oferta ser recusada item a item — a dona descobriria no Merchant Center, dias
// depois, e não no save. O banco tem o mesmo `check`, nomeado, e `googleShoppingSchema.test.ts`
// compara os dois.

import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@estrelinha/ui/select'
import { GOOGLE_AGE_GROUPS, GOOGLE_GENDERS } from '@estrelinha/supabase/types/settings'
import { FormCard } from '@/shared/ui'
import type { ProductFormState } from '../model/useProductForm'

/** Só os campos desta feature — o card não conhece o resto do formulário. */
type Campo = 'brand' | 'mpn' | 'age_group' | 'gender' | 'google_product_category'

interface Props {
  form: ProductFormState
  onChange: (campo: Campo, valor: string) => void
}

const AGE_LABEL: Record<string, string> = {
  newborn: 'Recém-nascido',
  infant: 'Bebê',
  toddler: 'Criança pequena',
  kids: 'Infantil',
  adult: 'Adulto',
}

const GENDER_LABEL: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  unisex: 'Unissex',
}

/** O Select do Radix não aceita `value=""`; este é o valor que representa "não informado". */
const VAZIO = '__vazio__'

export const GoogleShoppingCard = ({ form, onChange }: Props) => (
  <FormCard
    title="Google Shopping"
    description="Como este produto é descrito no feed do Google. Deixe em branco o que não se aplica."
  >
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="gs-brand">Marca</Label>
        <Input
          id="gs-brand"
          value={form.brand}
          onChange={e => onChange('brand', e.target.value)}
          placeholder="Uma Estrelinha"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gs-mpn">MPN</Label>
        <Input
          id="gs-mpn"
          value={form.mpn}
          onChange={e => onChange('mpn', e.target.value)}
          placeholder="Código do fabricante"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gs-age">Faixa etária</Label>
        <Select
          value={form.age_group || VAZIO}
          onValueChange={v => onChange('age_group', v === VAZIO ? '' : v)}
        >
          <SelectTrigger id="gs-age">
            <SelectValue placeholder="Não informado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VAZIO}>Não informado</SelectItem>
            {GOOGLE_AGE_GROUPS.map(v => (
              <SelectItem key={v} value={v}>
                {AGE_LABEL[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gs-gender">Sexo</Label>
        <Select
          value={form.gender || VAZIO}
          onValueChange={v => onChange('gender', v === VAZIO ? '' : v)}
        >
          <SelectTrigger id="gs-gender">
            <SelectValue placeholder="Não informado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VAZIO}>Não informado</SelectItem>
            {GOOGLE_GENDERS.map(v => (
              <SelectItem key={v} value={v}>
                {GENDER_LABEL[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="gs-category">Categoria do Google</Label>
        <Input
          id="gs-category"
          value={form.google_product_category}
          onChange={e => onChange('google_product_category', e.target.value)}
          placeholder="Apparel &amp; Accessories &gt; Jewelry"
        />
        <p className="text-xs text-muted-foreground">
          Em branco, usa a categoria padrão da loja definida em Google Shopping.
        </p>
      </div>
    </div>

    {/* Joia artesanal não tem código de barras. Este é o mesmo estado que a Nuvemshop grava hoje
        ("produto único ou vintage sem identificador"), e é o padrão da loja — o campo existe para
        registrar a exceção, não a regra. */}
    <p className="mt-4 text-xs text-muted-foreground">
      Sem GTIN: o feed declara <code>identifier_exists: no</code>, que é o correto para peça
      artesanal.
    </p>
  </FormCard>
)
