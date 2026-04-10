import { useCellValue, usePublisher } from '@mdxeditor/gurx'
import { currentBlockType$, convertSelectionToNode$ } from '@mdxeditor/editor'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createParagraphNode } from 'lexical'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

const BLOCK_TYPES = [
  { value: 'paragraph', label: 'Paragraf' },
  { value: 'h1', label: 'Başlık 1' },
  { value: 'h2', label: 'Başlık 2' },
  { value: 'h3', label: 'Başlık 3' },
  { value: 'h4', label: 'Başlık 4' },
  { value: 'h5', label: 'Başlık 5' },
  { value: 'h6', label: 'Başlık 6' },
  { value: 'quote', label: 'Alıntı' },
]

export default function BlockTypeSelectToolbar() {
  const currentBlockType = useCellValue(currentBlockType$)
  const convertSelectionToNode = usePublisher(convertSelectionToNode$)

  const handleChange = (blockType) => {
    switch (blockType) {
      case 'quote':
        convertSelectionToNode(() => $createQuoteNode())
        break
      case 'paragraph':
        convertSelectionToNode(() => $createParagraphNode())
        break
      default:
        if (blockType.startsWith('h')) {
          convertSelectionToNode(() => $createHeadingNode(blockType))
        }
    }
  }

  return (
    <Select value={currentBlockType || 'paragraph'} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-32 text-xs border-border bg-transparent">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BLOCK_TYPES.map(t => (
          <SelectItem key={t.value} value={t.value} className="text-xs">
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
