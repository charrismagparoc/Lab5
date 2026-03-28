import { useState, useMemo } from 'react'

export function useSearch(items, filterFn, initial = {}) {
  const [query,   setQuery]   = useState('')
  const [filters, setFilters] = useState(initial)

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const results = useMemo(() =>
    items.filter(item => filterFn(item, { query, filters }))
  , [items, query, filters, filterFn])

  return { query, setQuery, filters, setFilter, results }
}
