import { ArrowRight } from 'lucide-react'

const roleStyle = {
  Institution: {
    tabClass: 'bg-[#1E2431] text-white border-b-2 border-[#1EA1FE]',
    numClass: 'bg-[#2E3648] text-white',
    btnClass: 'bg-[#2E3648] text-white hover:bg-[#4A4D50]',
  },
  Teacher: {
    tabClass: 'bg-[#1EA1FE] text-white',
    numClass: 'bg-[#1EA1FE] text-white',
    btnClass: 'bg-[#1EA1FE] text-white hover:bg-[#0E8AE0]',
  },
  Student: {
    tabClass: 'bg-[#F3F6FB] text-[#0A0D14]',
    numClass: 'bg-[#F3F6FB] text-[#0A0D14]',
    btnClass: 'bg-[#F3F6FB] text-[#0A0D14] hover:bg-[#DEDCD2]',
  },
}

const tracks = [
  {
    role: 'Institution',
    tagline: 'Register once. Your whole school is ready.',
    steps: [
      { action: 'Register your institution', detail: 'Click "Access Portal", enter your school name and country. Takes two minutes.' },
      { action: 'Enable Google Sign\u2011In', detail: 'No passwords. Teachers and students sign in with their Google accounts automatically.' },
      { action: 'Choose your plan', detail: 'Start free with 5 assessments. Upgrade when your school is ready.' },
    ],
    cta: 'Register your institution',
  },
  {
    role: 'Teacher',
    tagline: 'Upload a Word doc. Everything else is handled.',
    steps: [
      { action: 'Sign in and select subjects', detail: 'Log in with Google, pick your subjects. Dashboard ready instantly.' },
      { action: 'Upload your exam', detail: 'Drop any Word document in \u2014 with or without a marking memo.' },
      { action: 'Review results in real time', detail: 'See every learner\u2019s results, concept gaps, and trends as they submit.' },
    ],
    cta: 'Start as a teacher',
  },
  {
    role: 'Student',
    tagline: 'Sign in, attempt, improve. That\u2019s it.',
    steps: [
      { action: 'Sign in with Google', detail: 'No account setup. Use your school Google account \u2014 you\u2019re in.' },
      { action: 'Start an available exam', detail: 'Pick from your active assessments. Timer starts when you begin.' },
      { action: 'Get instant feedback', detail: 'Results and concept gaps appear within a minute of submitting.' },
    ],
    cta: 'Start as a student',
  },
]

export default function ThreePaths({ onOpenModal }) {
  return (
    <section className="py-16 sm:py-24 px-4 bg-[#10141C] border-t border-white/5">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8">
        <div className="max-w-[640px] mx-auto mb-[56px] text-center">
          <span className="font-plex-mono text-[13px] font-semibold uppercase tracking-[0.15em] text-[#1EA1FE] block mb-4">
            • GET STARTED
          </span>
          <h2 className="font-zilla text-[clamp(30px,4vw,44px)] font-bold leading-[1.12] tracking-tight text-[#F3F6FB] mt-[14px]">
            Enrol and run your first exam{' '}
            <span className="font-caveat text-[#4BB8FF]" style={{ fontSize: '1.18em', transform: 'rotate(-2deg)' }}>in under ten minutes.</span>
          </h2>
          <p className="text-[17px] text-[#AEB7C7] leading-[1.6] mt-[16px]">
            Three paths — one for your institution, one for teachers, one for students. Follow the steps for your role and you're live.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-[10px] mb-[52px]">
          {['Free to start', 'No IT setup', 'Google sign\u2011in only', 'Any device, any browser', 'Results in under a minute'].map(
            (l) => (
              <span
                key={l}
                className="font-plex-mono text-[12px] font-medium text-[#AEB7C7] border border-white/10 bg-white/[0.06] rounded-full px-[13px] py-[7px] inline-flex items-center gap-[6px]"
              >
                <b className="text-[#4BB8FF] font-bold">✓</b>
                {l}
              </span>
            )
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[22px] items-stretch">
          {tracks.map((t) => {
            const s = roleStyle[t.role]
            return (
              <div key={t.role} className="rounded-[14px] bg-[#141822] border border-white/10 flex flex-col overflow-hidden">
                <div className={`p-[18px_24px_16px] flex items-center gap-[10px] font-plex-mono text-[12px] tracking-[.08em] font-bold ${s.tabClass}`}>
                  {t.role}
                </div>
                <div className="p-[22px_24px_26px] flex flex-col flex-1">
                  <h3 className="font-zilla text-[20px] font-bold leading-[1.3] mb-4 text-[#F3F6FB]">
                    {t.tagline}
                  </h3>
                  <div className="flex-1">
                    {t.steps.map((step, i) => (
                      <div key={i} className="flex gap-3 mb-4">
                        <div className={`w-[22px] h-[22px] rounded-full flex-none flex items-center justify-center font-plex-mono text-[11px] font-bold mt-0.5 ${s.numClass}`}>
                          {i + 1}
                        </div>
                        <div>
                          <b className="font-plex-sans text-[14.5px] font-bold text-[#F3F6FB] block mb-0.5">{step.action}</b>
                          <span className="font-plex-sans text-[13.5px] text-[#AEB7C7] leading-[1.5]">{step.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={onOpenModal}
                    className={`mt-auto justify-center w-full inline-flex items-center justify-center gap-2 px-6 py-[14px] rounded-[11px] font-sans font-semibold text-[15px] cursor-pointer transition-all ${s.btnClass}`}
                  >
                    {t.cta} <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center mt-7 text-[13.5px] text-[#6C7484]">
          Institution registers first — teachers and students join under it.
        </p>
      </div>
    </section>
  )
}
