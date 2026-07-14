import { KeyRound } from 'lucide-react'

export default function Mission({ onOpenModal }) {
  return (
    <section className="py-16 sm:py-24 px-4 bg-[#0A0D14]">
      <div className="max-w-2xl mx-auto text-center">
        <span className="font-plex-mono text-[10px] font-semibold uppercase tracking-widest text-[#22C55E] block mb-4">
          Focus on building learners, not on admin
        </span>
        <h2 className="font-zilla text-3xl sm:text-5xl font-bold text-[#F3F6FB] tracking-tight mb-4">
          Every learner, seen.
          <br />
          <span className="font-caveat text-[#4BB8FF]" style={{ fontSize: '1.18em', transform: 'rotate(-2deg)' }}>Every gap, closed.</span>
        </h2>
        <p className="font-plex-sans text-base text-[#AEB7C7] mb-10 max-w-md mx-auto leading-relaxed">
          Real-time performance tracking, AI-predicted outcomes, and a personal study coach — on a simple computer, online.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenModal}
            className="w-full sm:w-auto px-10 py-4 rounded-xl bg-[#1EA1FE] hover:bg-[#4BB8FF] text-[#0A0D14] font-bold text-sm shadow-xl shadow-[#1EA1FE]/25 transition-all"
          >
            Start for free →
          </button>
          <button
            onClick={onOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-[#F3F6FB] font-semibold text-sm hover:border-[#1EA1FE]/50 transition-all"
          >
            <KeyRound size={15} className="text-[#1EA1FE]" /> Access Portal
          </button>
        </div>
      </div>
    </section>
  )
}
