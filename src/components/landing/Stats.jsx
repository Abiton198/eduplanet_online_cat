export default function Stats() {
  const items = [
    { value: '0', label: 'Papers to carry home' },
    { value: '< 2 min', label: 'From upload to questions' },
    { value: '100%', label: 'Learners get feedback' },
    { value: 'Any', label: 'Curriculum supported' },
  ]

  return (
    <section className="py-10 px-4 bg-[#0A0D14]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map(({ value, label }) => (
            <div
              key={label}
              className="bg-[#141822] border border-white/5 rounded-xl p-5 text-center"
            >
              <p className="font-zilla text-2xl sm:text-3xl font-bold text-[#F3F6FB] mb-1">{value}</p>
              <p className="font-plex-sans text-xs text-[#AEB7C7] leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
