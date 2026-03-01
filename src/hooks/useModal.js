import { useState, useCallback } from 'react'

export function useModal(initial = null) {
  const [data, setData] = useState(initial)
  const open  = useCallback((payload = true) => setData(payload), [])
  const close = useCallback(() => setData(null), [])
  const isOpen = data !== null

  return { data, isOpen, open, close }
}
