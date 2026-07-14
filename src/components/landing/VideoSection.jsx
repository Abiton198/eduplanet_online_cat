import { KeyRound } from 'lucide-react'

export default function VideoSection({ onOpenModal }) {
  return (
    <section className="py-16 sm:py-24 px-4 bg-[#10141C] text-center border-t border-b border-white/5">
      <div className="max-w-[920px] mx-auto">

        <span className="font-plex-mono text-[13px] font-semibold uppercase tracking-[0.15em] text-[#1EA1FE] block mb-4">
          • SEE IT IN ACTION
        </span>

        <h2 className="font-zilla text-[28px] sm:text-[34px] font-bold text-[#F3F6FB] leading-[1.2] mb-4">
          Watch Eduket{' '}
          <span className="font-caveat text-[#4BB8FF]" style={{ fontSize: '1.18em', transform: 'rotate(-2deg)' }}>
            mark a paper
          </span>
          , start to finish.
        </h2>

        <p className="font-plex-sans text-[15px] text-[#AEB7C7] max-w-[600px] mx-auto leading-relaxed mb-10">
          A short walkthrough of the whole loop — upload, mark, feedback — so you know exactly what your school is signing up for.
        </p>

        <div className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/10 bg-slate-900">
          <div className="absolute top-0 left-0 right-0 h-1 z-10 bg-[#1EA1FE]" />
          <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1920/1080' }}>
            <iframe
              src="https://share.synthesia.io/embeds/videos/9c45a63c-5bd7-4767-b288-a7938f9d7c5a"
              loading="lazy"
              title="Eduket OS — Smart learning for Africa"
              allowFullScreen
              allow="encrypted-media; fullscreen; microphone; screen-wake-lock;"
              style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, border: 'none', padding: 0, margin: 0, overflow: 'hidden' }}
            />
          </div>
        </div>

        <p className="font-plex-sans text-[14px] text-[#AEB7C7] mt-[22px] max-w-[600px] mx-auto leading-relaxed">
          3-minute introduction &middot; Teacher uploads, student completes, results appear instantly.
        </p>

        <div className="flex justify-center mt-8">
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#1EA1FE] hover:bg-[#4BB8FF] text-[#0A0D14] font-bold text-sm shadow-lg shadow-[#1EA1FE]/20 transition-all"
          >
            <KeyRound size={15} /> Access Portal
          </button>
        </div>
      </div>
    </section>
  )
}
