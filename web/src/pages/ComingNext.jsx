export default function ComingNext({ name }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-lg bg-sunken p-12 text-center">
      <span className="text-[18px] font-semibold">{name}</span>
      <span className="max-w-md text-body-sm text-muted">This page is next on the build list. Its data is already in web/public/data.</span>
    </div>
  )
}
