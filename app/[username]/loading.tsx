// Instant shell while the profile's data fetch runs — mirrors the real
// layout (header, graph, stats, rail) so the swap doesn't shift.
export default function ProfileLoading() {
  return (
    <div
      aria-hidden
      className="mx-auto max-w-2xl animate-pulse px-6 py-14 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/60" />
        <div>
          <div className="h-[22px] w-44 rounded bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="mt-2 h-[13px] w-64 rounded bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
      </div>

      <div
        className="mt-6 w-full rounded bg-zinc-100 dark:bg-zinc-800/60"
        style={{ aspectRatio: "663 / 104" }}
      />

      <div className="mt-5 h-[13px] w-80 rounded bg-zinc-100 dark:bg-zinc-800/60" />

      <div className="relative mt-10">
        <span className="absolute bottom-2 left-3 top-0 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <ul>
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="relative py-2 pl-10">
              <div className="h-[15px] w-3/4 rounded bg-zinc-100 dark:bg-zinc-800/60" />
              <div className="mt-2 h-[12px] w-48 rounded bg-zinc-100 dark:bg-zinc-800/60" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
