const nf = new Intl.NumberFormat('en-US')

export const num = (n) => (n == null ? '–' : nf.format(n))
export const peso = (n) => (n == null ? '–' : `₱${nf.format(Math.round(n))}`)
export const pesoShort = (n) => {
  if (n == null) return '–'
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `₱${Math.round(n / 1000)}k`
  return `₱${n}`
}
export const pct = (n, digits = 1) => (n == null ? '–' : `${Number(n).toFixed(digits).replace(/\.0$/, '')}%`)

export const dateLabel = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
