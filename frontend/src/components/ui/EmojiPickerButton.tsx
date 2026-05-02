import { useRef, useState } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

interface Props {
  emoji: string
  onSelect: (emoji: string) => void
  defaultEmoji?: string
}

export default function EmojiPickerButton({ emoji, onSelect, defaultEmoji = '🫙' }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!showPicker && buttonRef.current) {
            const r = buttonRef.current.getBoundingClientRect()
            const pickerH = 400
            const pickerW = 352
            const top = r.top > pickerH + 8 ? r.top - pickerH - 8 : r.bottom + 8
            const left = Math.min(r.left, window.innerWidth - pickerW - 8)
            setPickerPos({ top, left })
          }
          setShowPicker(p => !p)
        }}
        className="flex-shrink-0 w-[38px] h-[38px] rounded-md border text-[22px] flex items-center justify-center transition-all hover:border-[var(--green)]"
        style={{ borderColor: showPicker ? 'var(--green)' : 'var(--border2)', background: 'var(--surface)' }}
        title="Pick emoji"
      >
        {emoji || defaultEmoji}
      </button>
      {showPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowPicker(false)} />
          <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}>
            <Picker
              data={data}
              theme="light"
              set="native"
              previewPosition="none"
              onEmojiSelect={(em: { native: string }) => {
                onSelect(em.native)
                setShowPicker(false)
              }}
            />
          </div>
        </>
      )}
    </>
  )
}
