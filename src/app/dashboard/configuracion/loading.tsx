export default function ConfiguracionLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <div
          className="h-8 w-56 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        <div
          className="mt-2 h-4 w-80 rounded-[8px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>

      {/* Filters + button row skeleton */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-40 rounded-[12px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
        ))}
        <div
          className="h-10 w-44 rounded-[12px] animate-pulse bg-[#e0e5ec] ml-auto"
          style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
        />
      </div>

      {/* Table skeleton */}
      <div
        className="rounded-[20px] bg-[#e0e5ec] overflow-hidden"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        {/* Table header */}
        <div className="p-4 border-b border-[#c8cfd8] flex gap-4">
          {[2, 3, 2, 2, 3, 2, 2, 2].map((w, i) => (
            <div
              key={i}
              className={`h-4 rounded-[6px] animate-pulse bg-[#e0e5ec] flex-shrink-0`}
              style={{
                width: `${w * 2.5}rem`,
                boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
              }}
            />
          ))}
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="p-4 border-b border-[#c8cfd8] last:border-0 flex gap-4 items-center"
          >
            {[2, 3, 2, 2, 3, 2, 2, 2].map((w, i) => (
              <div
                key={i}
                className="h-4 rounded-[6px] animate-pulse bg-[#e0e5ec] flex-shrink-0"
                style={{
                  width: `${w * 2.5 * (0.7 + Math.random() * 0.5)}rem`,
                  boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
