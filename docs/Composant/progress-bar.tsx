export function ProgressBar({ progress = 25 }: { progress?: number }) {
  return (
    <div
      className="h-[3px] w-full rounded-full"
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
