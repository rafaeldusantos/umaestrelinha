import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Undo, Redo } from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { useEffect } from 'react'

interface Props {
  content: string
  onChange: (html: string) => void
}

const MenuButton = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
  <Button
    type="button"
    variant={active ? 'default' : 'ghost'}
    size="icon"
    className="h-8 w-8"
    onClick={onClick}
    title={title}
  >
    {children}
  </Button>
)

const RichTextEditor = ({ content, onChange }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt('URL da imagem:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-border bg-muted/30">
        <MenuButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título H2">
          <Heading2 className="w-4 h-4" />
        </MenuButton>
        <MenuButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título H3">
          <Heading3 className="w-4 h-4" />
        </MenuButton>
        <MenuButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <MenuButton active={editor.isActive('link')} onClick={addLink} title="Link">
          <LinkIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={addImage} title="Imagem">
          <ImageIcon className="w-4 h-4" />
        </MenuButton>
        <div className="flex-1" />
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[160px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px]" />
    </div>
  )
}

export default RichTextEditor
