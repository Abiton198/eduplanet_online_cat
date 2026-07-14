export default function HowItWorks() {
  const steps = [
    { n: '01', title: 'Institution registers', body: 'School signs up in 5 minutes. Google account only — no passwords, no IT.' },
    { n: '02', title: 'Teacher uploads', body: 'Drop any Word document. With or without a marking memo.' },
    { n: '03', title: 'AI extracts', body: 'Questions, diagrams, equations, and tables structured automatically.' },
    { n: '04', title: 'Learner completes', body: 'Any device, any browser. Timed or open. All question types supported.' },
    { n: '05', title: 'Instant marking', body: 'Partial credit. Spelling forgiven. Concept-level feedback per question.' },
    { n: '06', title: 'Everyone sees results', body: 'Student: gaps + study plan. Teacher: class overview. Principal: school trends.' },
  ]

  return (
    <section className="py-16 sm:py-24 px-4 bg-[#10141C] border-b border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="font-plex-mono text-[13px] font-semibold uppercase tracking-[0.15em] text-[#1EA1FE] block mb-4">
            • HOW IT WORKS
          </span>
          <h2 className="font-zilla text-3xl sm:text-4xl font-bold text-[#F3F6FB] tracking-tight">
            From upload to results{' '}
            <span className="font-caveat text-[#4BB8FF]" style={{ fontSize: '1.18em', transform: 'rotate(-2deg)' }}>in under ten minutes.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map(({ n, title, body }) => (
            <div
              key={n}
              className="bg-[#141822] border border-white/5 rounded-xl p-6 hover:border-[#1EA1FE]/30 transition-all group"
            >
              <span className="font-plex-mono text-xs font-bold text-[#1EA1FE] mb-2 block">{n}</span>
              <h3 className="font-plex-sans text-base font-bold text-[#F3F6FB] mb-2">{title}</h3>
              <p className="font-plex-sans text-sm text-[#AEB7C7] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[18px] mt-[56px]">
          {[
            { ring: '0', label: 'Papers to carry home' },
            { ring: '< 2 min', label: 'From upload to questions' },
            { ring: '100%', label: 'Learners get feedback' },
            { ring: 'Any', label: 'Curriculum supported' },
          ].map(({ ring, label }) => (
            <div
              key={label}
              className="border border-white/10 rounded-[14px] p-[22px_16px] text-center bg-[#141822] hover:border-[#1EA1FE]/30 transition-all"
            >
              <div className="w-[64px] h-[64px] mx-auto mb-[12px] rounded-full border-[2.5px] border-[#1EA1FE] flex items-center justify-center font-plex-mono font-bold text-[14px] text-[#4BB8FF]">
                {ring}
              </div>
              <p className="font-plex-sans text-[12.5px] text-[#6C7484] mt-[2px]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
