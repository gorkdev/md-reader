import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  codeBlockPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CreateLink,
  ListsToggle,
  InsertThematicBreak,
  Separator,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import BlockTypeSelectToolbar from '@/components/BlockTypeSelectToolbar'
import BlameOverlay from '@/components/BlameOverlay'
import { useTheme } from '@/contexts/ThemeContext'

export default function MarkdownEditor({ value, onChange, blame, className = '' }) {
  const { theme } = useTheme()
  return (
    <div className={`mdx-shell relative ${className}`}>
      <MDXEditor
        markdown={value || ''}
        onChange={onChange}
        className={theme === 'dark' ? 'dark-theme dark-editor' : ''}
        contentEditableClassName="mdx-content-editable"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <BlockTypeSelectToolbar />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertThematicBreak />
                {blame && blame.length > 0 && <BlameOverlay blame={blame} />}
              </>
            ),
          }),
        ]}
      />
    </div>
  )
}
