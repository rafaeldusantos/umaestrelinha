// RFN-09 / T56 — o inspetor.
//
// A AC 1 tem uma prova específica: o payload de `Salvar` precisa conter `parent_id` e `banner_url`
// — as colunas que a `T52` criou e cuja ausência fazia TODO save morrer em PGRST204. Um teste que
// só checasse "onSave foi chamado" passaria com o payload velho e quebrado.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { reservedSlugRefusal } from '@estrelinha/core/routes'
import CategoryInspector from './CategoryInspector'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory => ({
  slug: over.slug ?? over.id,
  description: null, image_url: null, banner_url: null, color_accent: null,
  active: true, sort_order: 0, parent_id: null, product_count: 0,
  ...over,
} as AdminCategory)

const catalog = () => [
  cat({ id: 'anime', name: 'Anime', product_count: 6 }),
  cat({ id: 'sailor', name: 'Sailor Moon', parent_id: 'anime' }),
  cat({ id: 'kpop', name: 'K-Pop' }),
]

const setup = (over: Partial<React.ComponentProps<typeof CategoryInspector>> = {}) => {
  const props = {
    category: catalog()[0],
    allCategories: catalog(),
    productCount: 6,
    onSave: vi.fn().mockResolvedValue(null),
    onClose: vi.fn(),
    ...over,
  }
  render(<CategoryInspector {...props} />)
  return props
}

describe('CategoryInspector — Salvar grava o que a T52 criou (T56 AC 1)', () => {
  it('o payload leva `parent_id` e `banner_url` — as colunas do PGRST204', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('Imagem de capa'), { target: { value: 'https://cdn/capa.webp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', expect.objectContaining({
      banner_url: 'https://cdn/capa.webp',
      parent_id: null,
    }))
  })

  it('grava nome, slug, descrição e visibilidade editados', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Animê' } })
    fireEvent.change(screen.getByLabelText('URL da categoria'), { target: { value: 'anime-br' } })
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Bottons de anime' } })
    fireEvent.click(screen.getByLabelText('Mostrar na vitrine'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', {
      name: 'Animê',
      slug: 'anime-br',
      description: 'Bottons de anime',
      banner_url: null,
      parent_id: null,
      active: false,
    })
  })

  it('campo vazio vira `null`, não string vazia — o banco distingue os dois', () => {
    const { onSave } = setup({
      category: cat({ id: 'anime', name: 'Anime', description: 'algo', banner_url: 'https://x' }),
    })

    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Imagem de capa'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', expect.objectContaining({
      description: null,
      banner_url: null,
    }))
  })
})

describe('CategoryInspector — o seletor de pai (T56 AC 2)', () => {
  it('não oferece a própria categoria nem uma filha dela', () => {
    setup()

    const opcoes = screen.getAllByRole('option').map(o => o.textContent)

    expect(opcoes).not.toContain('Anime')
    expect(opcoes).not.toContain('Sailor Moon')
    expect(opcoes).toEqual(['Nenhuma — categoria raiz', 'K-Pop'])
  })

  it('escolher um pai grava o id dele', () => {
    const { onSave } = setup({ category: catalog()[2] })

    fireEvent.change(screen.getByLabelText('Categoria pai'), { target: { value: 'anime' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('kpop', expect.objectContaining({ parent_id: 'anime' }))
  })
})

describe('CategoryInspector — Cancelar (T56 AC 3)', () => {
  it('cancelar com alteração pendente não grava nada', () => {
    const { onSave, onClose } = setup()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outro nome' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('sem alteração, `Salvar` fica desabilitado e o rodapé diz que está tudo salvo', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByText('Tudo salvo')).toBeInTheDocument()
  })

  it('com alteração, o rodapé avisa que há pendência', () => {
    setup()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mudou' } })

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })
})

/**
 * `URL-05` — o slug reservado recusado na EDIÇÃO.
 *
 * São duas superfícies porque são dois caminhos diferentes: no diálogo de criar, o slug vem do nome
 * sozinho; aqui ele é digitado à mão, num campo que **só** aceita slug. Cobrir uma delas deixaria a
 * outra metade aberta.
 */
describe('CategoryInspector — slug reservado é recusado (URL-05)', () => {
  it('digitar um endereço reservado mostra o motivo, com a lista visível', () => {
    setup()

    fireEvent.change(screen.getByLabelText('URL da categoria'), { target: { value: 'sobre' } })

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(reservedSlugRefusal('sobre'))
    expect(alerta).toHaveTextContent('checkout')
    expect(alerta).toHaveTextContent('favoritos')
  })

  it('`Salvar` não grava enquanto o slug for reservado', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('URL da categoria'), { target: { value: 'conta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('slug livre continua gravando, e nenhum aviso aparece', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('URL da categoria'), { target: { value: 'anime-br' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', expect.objectContaining({ slug: 'anime-br' }))
  })
})

/**
 * `URL-03` — o prefixo que o inspetor mostra passa a ser o endereço real.
 *
 * O rótulo exibia `/categoria/`, **que nunca foi uma URL desta loja**: a rota antiga era
 * `/colecao/:slug` e a nova é a raiz do domínio (`AD-018`). Rótulo que mente não quebra nada — quem
 * cadastra copia o endereço, cola no Instagram e descobre depois que ele nunca respondeu.
 *
 * E agora o prefixo **depende do pai**: raiz vive em `umaestrelinha.com.br/<slug>`, filha em
 * `umaestrelinha.com.br/<pai>/<slug>`. Por isso ele tem de acompanhar o `<select>` antes do save —
 * escolher o pai é escolher o endereço.
 */
describe('CategoryInspector — o prefixo é a URL pública real (URL-03)', () => {
  it('categoria raiz mostra `umaestrelinha.com.br/`', () => {
    setup()

    expect(screen.getByText('umaestrelinha.com.br/')).toBeInTheDocument()
  })

  it('categoria filha mostra `umaestrelinha.com.br/<slug do pai>/`', () => {
    setup({ category: catalog()[1] })

    expect(screen.getByText('umaestrelinha.com.br/anime/')).toBeInTheDocument()
  })

  it('trocar o pai no `<select>` atualiza o prefixo — sem salvar', () => {
    const { onSave } = setup({ category: catalog()[2] })

    expect(screen.getByText('umaestrelinha.com.br/')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Categoria pai'), { target: { value: 'anime' } })

    expect(screen.getByText('umaestrelinha.com.br/anime/')).toBeInTheDocument()
    // O endereço muda na tela, e nada foi gravado: a decisão é informada ANTES do save.
    expect(onSave).not.toHaveBeenCalled()
  })

  it('nenhum arquivo do backoffice escreve o prefixo `/categoria/`, que nunca existiu', () => {
    // O caminho por extenso: a régua não pode ser o objeto medido.
    const HERE = dirname(fileURLToPath(import.meta.url))
    const ROOT = resolve(HERE, '../../../../../..')
    const SRC = join(ROOT, 'apps/backoffice/src')

    const arquivos = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) return arquivos(full)
        return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []
      })

    const files = arquivos(SRC)
    // Âncora dupla: leu arquivos de verdade E alcançou as duas telas que exibiam o rótulo.
    expect(files.length).toBeGreaterThan(100)
    for (const alvo of ['CategoryInspector.tsx', 'CategoryTable.tsx']) {
      expect(files.some(file => file.replace(/\\/g, '/').endsWith(`category-list/ui/${alvo}`))).toBe(true)
    }

    const offenders = files
      .flatMap(file =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((text, index) => ({ file, line: index + 1, text }))
          // Este arquivo cita a string que procura; sem a exceção ele se acusa.
          .filter(entry => entry.text.includes('/categoria/') && !entry.file.endsWith('CategoryInspector.test.tsx')),
      )
      .map(entry => `${relative(SRC, entry.file).replace(/\\/g, '/')}:${entry.line} — ${entry.text.trim()}`)

    expect(offenders).toEqual([])
  })
})

describe('CategoryInspector — trocar de categoria (T56)', () => {
  it('selecionar outra categoria recarrega o formulário em vez de manter o rascunho', () => {
    const { rerender } = render(
      <CategoryInspector
        category={catalog()[0]}
        allCategories={catalog()}
        productCount={6}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Rascunho perdido' } })

    rerender(
      <CategoryInspector
        category={catalog()[2]}
        allCategories={catalog()}
        productCount={5}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('K-Pop')
  })
})
