export default function UsuariosLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-6">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div
            className="h-8 w-44 rounded-[12px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
          <div
            className="mt-2 h-4 w-56 rounded-[8px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
        </div>
        {/* Add user button skeleton */}
        <div
          className="h-10 w-36 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
        />
      </div>

      {/* Table card */}
      <div
        className="rounded-[20px] p-6 bg-[#e0e5ec]"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 mb-4 px-2">
          {['Nombre', 'Email', 'Rol', 'Acciones'].map((col) => (
            <div
              key={col}
              className="h-4 rounded-[6px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
          ))}
        </div>

        {/* Divider */}
        <div
          className="h-[1px] bg-[#e0e5ec] mb-4"
          style={{ boxShadow: 'inset 1px 1px 3px #b8bec7' }}
        />

        {/* 5 table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 mb-3 px-2 py-3 rounded-[12px] bg-[#e0e5ec]"
            style={{
              boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
              animationDelay: `${i * 0.08}s`,
            }}
          >
            {/* Name */}
            <div
              className="h-4 rounded-[6px] animate-pulse bg-[#e0e5ec]"
              style={{
                boxShadow: 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff',
                width: `${60 + (i % 3) * 15}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
            {/* Email */}
            <div
              className="h-4 rounded-[6px] animate-pulse bg-[#e0e5ec]"
              style={{
                boxShadow: 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff',
                animationDelay: `${i * 0.08 + 0.05}s`,
              }}
            />
            {/* Rol badge */}
            <div
              className="h-6 w-20 rounded-full animate-pulse bg-[#e0e5ec]"
              style={{
                boxShadow: 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff',
                animationDelay: `${i * 0.08 + 0.1}s`,
              }}
            />
            {/* Actions */}
            <div className="flex gap-2">
              <div
                className="h-7 w-7 rounded-[8px] animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff' }}
              />
              <div
                className="h-7 w-7 rounded-[8px] animate-pulse bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
