import { useState } from 'react'

export default function SOTextArea({ defaultValue = '', placeholder, onChange }) {
  const [content, setConent] = useState(defaultValue)

  return (
    <textarea
      placeholder={placeholder}
      value={content}
      onChange={(e) => {
        setConent(e.target.value)
      }}
      className="min-h-12 w-full resize-none rounded-lg border border-line p-3 text-sm outline-none focus:border-brand-600"
    />
  )
}
