import { ArrowRight, KeyRound, Shield, Lock, Eye, CheckCircle2, Sparkles } from 'lucide-react'
import EditorCard from './EditorCard'

const trustItems = [
  { icon: Shield, label: 'reCAPTCHA protected' },
  { icon: Lock, label: 'Firebase encrypted' },
  { icon: Eye, label: 'POPIA compliant' },
  { icon: CheckCircle2, label: 'No credit card' },
]

export default function Hero({ onOpenModal }) {
  return (
    <section className="pt-[120px] pb-10 px-4">
      <div className="grid grid-cols-[1.05fr_0.95fr] gap-14 max-w-[1160px] mx-auto items-center max-[920px]:grid-cols-1">

        {/* Left column — text */}
        <div className="text-left">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1EA1FE]/10 border border-[#1EA1FE]/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1EA1FE] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1EA1FE]" />
            </span>
            <Sparkles size={12} className="text-[#1EA1FE]" />
            <span className="font-plex-sans text-xs font-semibold text-[#1EA1FE]">
              Africa's first AI-powered school OS
            </span>
          </div>

          {/* Heading */}
          <h1
            className="font-zilla font-bold text-[#F3F6FB] leading-[1.05] tracking-tight mt-5"
            style={{ fontSize: 'clamp(40px,6vw,64px)' }}
          >
            Stop marking.
            <br />
            <span
              className="font-caveat font-bold text-[#1EA1FE]"
              style={{ display: 'inline-block', transform: 'rotate(-2deg)' }}
            >
              Start teaching.
            </span>
          </h1>

          {/* Description */}
          <p className="font-plex-sans text-[18px] text-[#AEB7C7] leading-relaxed mt-6 max-w-[540px]">
            <span className="text-[#1EA1FE] font-semibold">Eduket OS</span> turns any Word document into a fully marked,
            individually analysed assessment — in minutes. Homework, class tests, practicals, exams. Every learner. Every
            subject. Any curriculum.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#1EA1FE] hover:bg-[#4BB8FF] text-[#0A0D14] font-bold text-[15px] shadow-lg shadow-[#1EA1FE]/20 transition-all"
            >
              Start for free <ArrowRight size={16} />
            </button>
            <button
              onClick={onOpenModal}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-[#1EA1FE]/40 text-[#F3F6FB] font-semibold text-[15px] hover:border-[#1EA1FE] hover:bg-[#1EA1FE]/5 transition-all"
            >
              <KeyRound size={15} className="text-[#1EA1FE]" /> Access Portal
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mt-9">
            {trustItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#141822] border border-white/5 text-[#AEB7C7]"
              >
                <Icon size={12} className="text-[#1EA1FE]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right column — editor card */}
        <div className="flex justify-center items-center max-[920px]:mt-8">
          <EditorCard />
        </div>

      </div>
    </section>
  )
}
