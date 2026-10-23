import { useEffect, useState } from 'react'

// Each analytics file is fetched once per page load and shared between pages.
const cache = new Map()

function load(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      fetch(`/data/${name}.json`).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${name}.json (${res.status})`)
        return res.json()
      }),
    )
  }
  return cache.get(name)
}

/** useData('overview', 'meta') -> { data: { overview, meta }, error, loading } */
export function useData(...names) {
  const key = names.join(',')
  const [state, setState] = useState({ data: null, error: null, loading: true })

  useEffect(() => {
    let alive = true
    Promise.all(names.map(load))
      .then((values) => {
        if (!alive) return
        setState({ data: Object.fromEntries(names.map((n, i) => [n, values[i]])), error: null, loading: false })
      })
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
