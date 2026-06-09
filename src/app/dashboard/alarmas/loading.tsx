export default function AlarmasLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <div
          className="h-8 w-52 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        <div
          className="mt-2 h-4 w-80 rounded-[8px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>

      {/* Filtros skeleton */}
      <div className="flex gap-3 mb-6">
        <div
          className="h-9 w-40 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        <div
          className="h-9 w-36 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[20px] p-5 bg-[#e0e5ec] flex flex-col gap-3"
            style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <div
                  className="h-3 w-20 rounded-[6px] animate-pulse bg-[#e0e5ec]"
                  style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
                />
                <div
                  className="h-5 w-32 rounded-[8px] animate-pulse bg-[#e0e5ec]"
                  style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
                />
              </div>
              <div
                className="h-5 w-24 rounded-full animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              />
            </div>

            <div
              className="h-14 rounded-[12px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div
              className="h-10 rounded-[12px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />

            <div className="flex gap-2 pt-1">
              <div
                className="flex-1 h-9 rounded-[12px] animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              />
              <div
                className="flex-1 h-9 rounded-[12px] animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
