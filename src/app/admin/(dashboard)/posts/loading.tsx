export default function LoadingPosts() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading posts</p>

      <div className="h-8 w-40 animate-pulse rounded-sm bg-white/10" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="panel h-28 animate-pulse rounded-sm" />
        ))}
      </div>
    </div>
  );
}
