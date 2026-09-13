import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH } from '../../constants.ts'
import { EMAIL_RE, adminUserRefusal, normalizeEmail } from '../refusals.ts'

// As ACs `USR-05`, `USR-06` e `USR-21` da feature 48, uma a uma.
//
// O veredito é `string | null` — a asserção é sobre o TEXTO, não sobre um booleano: é o texto que
// chega à dona, e uma recusa que volta com a mensagem errada é indistinguível de uma que volta certa
// quando o teste só pergunta "recusou?".

describe('normalizeEmail — o dono único da normalização', () => {
  it('apara espaço e baixa a caixa', () => {
    expect(normalizeEmail('  Ana@Exemplo.INVALID  ')).toBe('ana@exemplo.invalid')
  })

  it('sobrevive a nulo e a indefinido sem lançar', () => {
    expect(normalizeEmail(undefined as unknown as string)).toBe('')
    expect(normalizeEmail(null as unknown as string)).toBe('')
  })

  it('é idempotente — normalizar duas vezes dá o mesmo', () => {
    const uma = normalizeEmail(' ADRI@Exemplo.invalid ')
    expect(normalizeEmail(uma)).toBe(uma)
  })
})

describe('EMAIL_RE', () => {
  it('aceita o formato que a loja já aceita', () => {
    expect(EMAIL_RE.test('adri@exemplo.invalid')).toBe(true)
  })

  it.each(['sem-arroba', 'sem@ponto', 'com espaco@exemplo.invalid', '@exemplo.invalid'])(
    'recusa %s',
    entrada => {
      expect(EMAIL_RE.test(entrada)).toBe(false)
    },
  )
})

describe('adminUserRefusal — USR-21: o nome', () => {
  it('recusa nome vazio nomeando o que fazer', () => {
    expect(adminUserRefusal({ name: '', email: 'a@b.invalid', password: 'segredo' })).toBe(
      'Informe o nome de quem vai acessar',
    )
  })

  it('recusa nome só com espaços — o caso que passa por `required` do HTML', () => {
    expect(adminUserRefusal({ name: '   ', email: 'a@b.invalid', password: 'segredo' })).toBe(
      'Informe o nome de quem vai acessar',
    )
  })

  it('aceita nome com espaço no meio e apara as bordas', () => {
    expect(
      adminUserRefusal({ name: '  Adri Muniz  ', email: 'a@b.invalid', password: 'segredo' }),
    ).toBeNull()
  })
})

describe('adminUserRefusal — USR-05: o e-mail', () => {
  it('recusa e-mail inválido com o texto exato da spec', () => {
    expect(adminUserRefusal({ name: 'Adri', email: 'sem-arroba', password: 'segredo' })).toBe(
      'E-mail inválido',
    )
  })

  it('recusa e-mail vazio', () => {
    expect(adminUserRefusal({ name: 'Adri', email: '', password: 'segredo' })).toBe('E-mail inválido')
  })

  it('aceita e-mail com espaço nas bordas e caixa alta — a normalização vale para a régua', () => {
    // Edge case da spec: "WHEN o e-mail tem espaços ou caixa alta THEN o sistema SHALL normalizar".
    // Sem passar por `normalizeEmail` aqui, ` Ana@X.invalid ` reprovaria no `EMAIL_RE` por causa do
    // espaço — e a dona leria "E-mail inválido" sobre um endereço que é válido.
    expect(
      adminUserRefusal({ name: 'Ana', email: '  Ana@Exemplo.INVALID  ', password: 'segredo' }),
    ).toBeNull()
  })
})

describe('adminUserRefusal — USR-06: a senha', () => {
  it('recusa senha curta NOMEANDO o mínimo, lido da constante', () => {
    const curta = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(adminUserRefusal({ name: 'Adri', email: 'a@b.invalid', password: curta })).toBe(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
  })

  it('aceita senha exatamente no mínimo — a borda', () => {
    expect(
      adminUserRefusal({
        name: 'Adri',
        email: 'a@b.invalid',
        password: 'a'.repeat(MIN_PASSWORD_LENGTH),
      }),
    ).toBeNull()
  })

  it('`password` AUSENTE não valida senha — é o caso da edição, que não troca senha', () => {
    expect(adminUserRefusal({ name: 'Adri', email: 'a@b.invalid' })).toBeNull()
  })

  it('`password` VAZIO é recusa, e não omissão', () => {
    // A distinção que o `=== undefined` compra. Colapsar os dois em "sem senha, tudo bem" deixaria
    // criar acesso ao painel com senha vazia, e a função passaria a mentir para os dois chamadores.
    expect(adminUserRefusal({ name: 'Adri', email: 'a@b.invalid', password: '' })).toBe(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
  })
})

describe('adminUserRefusal — a ordem quando duas recusas se aplicam (L-005)', () => {
  it('nome vazio vence e-mail inválido', () => {
    expect(adminUserRefusal({ name: '', email: 'sem-arroba', password: 'segredo' })).toBe(
      'Informe o nome de quem vai acessar',
    )
  })

  it('e-mail inválido vence senha curta', () => {
    expect(adminUserRefusal({ name: 'Adri', email: 'sem-arroba', password: 'a' })).toBe(
      'E-mail inválido',
    )
  })

  it('as três erradas devolvem a do campo de cima', () => {
    expect(adminUserRefusal({ name: '  ', email: 'x', password: '' })).toBe(
      'Informe o nome de quem vai acessar',
    )
  })
})

describe('adminUserRefusal — o caminho feliz', () => {
  it('devolve null com os três campos válidos', () => {
    expect(
      adminUserRefusal({ name: 'Ana Helena', email: 'ana@exemplo.invalid', password: 'segredo123' }),
    ).toBeNull()
  })
})
