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

export default function MarkdownEditor({ value, onChange, className = '' }) {
  return (
    <div className={`mdx-shell ${className}`}>
      <MDXEditor
        markdown={value || ''}
        onChange={onChange}
        className="dark-theme dark-editor"
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
              </>
            ),
          }),
        ]}
      />
    </div>
  )
}
