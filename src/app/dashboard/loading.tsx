export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-6">
      {/* Header skeleton */}
      <div className="mb-8">
        <div
          className="h-8 w-48 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        <div
          className="mt-2 h-4 w-72 rounded-[8px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[20px] p-6 bg-[#e0e5ec]"
            style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
          >
            <div
              className="h-4 w-24 rounded-[8px] animate-pulse bg-[#e0e5ec] mb-4"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div
              className="h-10 w-16 rounded-[10px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
          </div>
        ))}
      </div>

      {/* Main content card */}
      <div
        className="rounded-[20px] p-6 bg-[#e0e5ec]"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        <div
          className="h-5 w-36 rounded-[8px] animate-pulse bg-[#e0e5ec] mb-6"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-4 rounded-[8px] animate-pulse bg-[#e0e5ec] mb-3"
            style={{
              boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
              width: `${70 + (i % 3) * 10}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
