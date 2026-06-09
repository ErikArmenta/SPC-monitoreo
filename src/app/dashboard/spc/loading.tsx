export default function SPCLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-6">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div
            className="h-8 w-56 rounded-[12px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
          <div
            className="mt-2 h-4 w-40 rounded-[8px] animate-pulse bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          />
        </div>
        {/* Recalcular button skeleton */}
        <div
          className="h-10 w-32 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
        />
      </div>

      {/* 2 metric cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[20px] p-5 bg-[#e0e5ec]"
            style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
          >
            <div
              className="h-4 w-20 rounded-[8px] animate-pulse bg-[#e0e5ec] mb-3"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            <div
              className="h-8 w-14 rounded-[8px] animate-pulse bg-[#e0e5ec]"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
          </div>
        ))}
      </div>

      {/* SPC chart area */}
      <div
        className="rounded-[20px] p-6 bg-[#e0e5ec]"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        <div
          className="h-5 w-32 rounded-[8px] animate-pulse bg-[#e0e5ec] mb-6"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />

        {/* Chart placeholder with pulsing horizontal line */}
        <div
          className="relative h-64 rounded-[16px] bg-[#e0e5ec] overflow-hidden"
          style={{ boxShadow: 'inset 3px 3px 8px #b8bec7, inset -3px -3px 8px #ffffff' }}
        >
          {/* UCL line */}
          <div
            className="absolute left-4 right-4 h-[2px] rounded-full animate-pulse bg-[#b8bec7]"
            style={{ top: '20%' }}
          />
          {/* CL line */}
          <div
            className="absolute left-4 right-4 h-[2px] rounded-full animate-pulse bg-[#b8bec7]"
            style={{ top: '50%', animationDelay: '0.2s' }}
          />
          {/* LCL line */}
          <div
            className="absolute left-4 right-4 h-[2px] rounded-full animate-pulse bg-[#b8bec7]"
            style={{ top: '80%', animationDelay: '0.4s' }}
          />

          {/* Data point dots */}
          {[15, 25, 35, 48, 55, 63, 72, 80].map((left, idx) => (
            <div
              key={idx}
              className="absolute w-3 h-3 rounded-full animate-pulse bg-[#b8bec7]"
              style={{
                left: `${left}%`,
                top: `${40 + (idx % 3) * 10}%`,
                animationDelay: `${idx * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
