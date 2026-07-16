const curricula = [
  { name: 'CAPS', status: 'South Africa' },
  { name: 'CBC', status: 'Kenya/Rwanda' },
  { name: 'BECE', status: 'Botswana' },
  { name: 'NERDC/UBE', status: 'Nigeria' },
  { name: 'ZIMSEC/Cambridge', status: 'Zimbabwe' },
  { name: 'ECZ', status: 'Zambia' },
  { name: 'WASSCE', status: 'Ghana' },
  { name: 'GCSE', status: 'Uganda' },
]

export default function CTA() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-[#0A0D14]">
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-14 items-center text-left max-w-[1140px] mx-auto">
        <div>
          <span className="font-plex-mono text-[12px] tracking-[0.12em] text-[#1EA1FE] uppercase flex items-center gap-2 mb-4 justify-start">
            <span className="w-[5px] h-[5px] rounded-full bg-[#1EA1FE] flex-none" />
            focus on building learners, not on admin
          </span>
          <h2 className="font-zilla text-[36px] font-bold text-[#F3F6FB] tracking-tight mb-4">
            Built for{' '}
            <span className="font-caveat text-[#4BB8FF]" style={{ fontSize: '1.18em', transform: 'rotate(-2deg)' }}>
              African
            </span>{' '}
            education.
          </h2>
          <p className="font-plex-sans text-[15px] text-[#AEB7C7] leading-[1.75] mb-4">
            <b className="text-[#F3F6FB] font-semibold">Eduket OS was built in South Africa</b>, for every learner on the continent. We know that a teacher in a classroom of 60 can't mark 60 different scripts by hand every weekend.
          </p>
          <p className="font-plex-sans text-[15px] text-[#AEB7C7] leading-[1.75] mb-4">
            Our AI marks instantly, identifies every concept gap, and builds a personal study plan for each learner — whether they're on a laptop at school or a phone at home.
          </p>
          <p className="font-plex-sans text-[15px] text-[#AEB7C7] leading-[1.75] mb-4">
            No imported platform. No generic LMS. Built for the curricula and classrooms that matter here.
          </p>
        </div>

        <div className="bg-[#141822] border border-[#232c3d] rounded-[14px] overflow-hidden shadow-2xl shadow-black/50">
          <div className="flex items-center gap-[14px] px-4 py-3 bg-[#0d111a] border-b border-[#232c3d]">
            <div className="flex gap-[6px]">
              <span className="w-[9px] h-[9px] rounded-full bg-[#2E3648]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#2E3648]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#2E3648]" />
            </div>
            <span className="font-plex-sans text-[11px] font-semibold text-[#AEB7C7] ml-2">Curriculum</span>
          </div>

          <div className="px-[22px] py-5">
            {curricula.map(({ name, status }, i) => (
              <div
                key={name}
                className={`flex items-center gap-3 py-[11px] font-plex-mono text-[13px] ${i < curricula.length - 1 ? 'border-b border-[#1a2130]' : ''}`}
              >
                <span className="text-[#4ade80]">✓</span>
                <span className="text-[#F3F6FB] flex-1">{name}</span>
                <span className="text-[#6C7484] text-[11px]">{status}</span>
              </div>
            ))}
          </div>

          <div className="px-[22px] py-3 bg-[#0d111a] border-t border-[#232c3d] font-plex-mono text-[11px] text-[#4ade80] flex items-center gap-2">
            <span className="w-[6px] h-[6px] rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
            All Curricula supported · growing every term (Maths & Accounts still under trial)
          </div>
        </div>
      </div>
    </section>
  )
}
