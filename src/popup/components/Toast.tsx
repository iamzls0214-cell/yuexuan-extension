import { useEffect } from 'react'

interface Props {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="absolute bottom-4 right-4 left-4 z-50 animate-[fadeIn_200ms_ease-out]">
      <div
        className={`rounded-xl px-4 py-3 text-xs font-medium text-center shadow-lg ${
          type === 'success'
            ? 'bg-[#00D4AA]/10 border border-[#00D4AA]/30 text-[#00D4AA]'
            : 'bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[#FF6B6B]'
        }`}
      >
        {message}
      </div>
    </div>
  )
}
