export default function TurnosLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <div
          className="h-7 w-52 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        <div
          className="mt-2 h-4 w-80 rounded-[8px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>

      {/* Card principal */}
      <div
        className="rounded-[20px] bg-[#e0e5ec] p-6"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        {/* Encabezado de tabla */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="h-5 w-44 rounded-[8px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
          <div
            className="h-9 w-32 rounded-[12px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
        </div>

        {/* 3 filas de tabla */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-[#e8ecf0] last:border-0">
            <div
              className="h-4 flex-1 rounded-[8px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div
              className="h-4 w-16 rounded-[8px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div
              className="h-4 w-16 rounded-[8px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div
              className="h-5 w-16 rounded-full animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div className="flex gap-2">
              <div
                className="h-7 w-16 rounded-[10px] animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              />
              <div
                className="h-7 w-20 rounded-[10px] animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              />
            </div>
          </div>
        ))}

        {/* Nota skeleton */}
        <div
          className="mt-6 h-10 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>
    </div>
  );
}
