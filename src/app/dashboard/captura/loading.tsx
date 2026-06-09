export default function CapturaLoading() {
  return (
    <div className="min-h-screen bg-[#e0e5ec] p-6">
      {/* Header skeleton */}
      <div className="mb-8">
        <div
          className="h-8 w-52 rounded-[12px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
        <div
          className="mt-2 h-4 w-64 rounded-[8px] animate-pulse bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />
      </div>

      {/* Form card */}
      <div
        className="max-w-xl mx-auto rounded-[20px] p-8 bg-[#e0e5ec]"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        <div
          className="h-6 w-40 rounded-[8px] animate-pulse bg-[#e0e5ec] mb-8"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        />

        {/* 4 form fields */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-6">
            {/* Label */}
            <div
              className="h-4 w-28 rounded-[6px] animate-pulse bg-[#e0e5ec] mb-2"
              style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
            />
            {/* Input */}
            <div
              className="h-12 w-full rounded-[12px] animate-pulse bg-[#e0e5ec]"
              style={{
                boxShadow: 'inset 3px 3px 7px #b8bec7, inset -3px -3px 7px #ffffff',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          </div>
        ))}

        {/* Submit button skeleton */}
        <div
          className="h-12 w-full rounded-[12px] animate-pulse bg-[#e0e5ec] mt-4"
          style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
        />
      </div>
    </div>
  );
}
