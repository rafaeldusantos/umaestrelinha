import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { MockupTemplate } from '@estrelinha/supabase/types'
import { deleteMockupAsset } from '../lib/uploadMockupAsset'

export type MockupTemplateInput = Omit<MockupTemplate, 'id' | 'created_at' | 'updated_at'>

export const useAdminMockups = () => {
  const [templates, setTemplates] = useState<MockupTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('mockup_templates')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error || !data) {
      setTemplates([])
    } else {
      setTemplates(data as MockupTemplate[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (template: MockupTemplateInput) => {
    const { error } = await supabase.from('mockup_templates').insert(template)
    if (!error) await fetch()
    return error
  }

  const update = async (id: string, updates: Partial<MockupTemplateInput>) => {
    const { error } = await supabase.from('mockup_templates').update(updates).eq('id', id)
    if (!error) await fetch()
    return error
  }

  const remove = async (id: string) => {
    const target = templates.find(t => t.id === id)
    const { error } = await supabase.from('mockup_templates').delete().eq('id', id)
    if (!error) {
      // Excluir também os assets do bucket (fundo + overlay), se houver.
      if (target?.background_url) await deleteMockupAsset(target.background_url)
      if (target?.overlay_url) await deleteMockupAsset(target.overlay_url)
      await fetch()
    }
    return error
  }

  return { templates, loading, fetch, create, update, remove }
}
