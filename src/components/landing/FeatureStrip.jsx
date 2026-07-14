const tags = [
  'Upload any Word doc',
  'Auto-mark with memo',
  'AI marks without memo',
  'Timed exams and tests',
  'Predict performance',
  'Per-learner concept gaps',
  'AI study coach',
  'Any curriculum, anywhere',
]

export default function FeatureStrip() {
  return (
    <section className="pt-9 pb-[46px] px-4 bg-[#0A0D14]">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8">
        <div className="flex flex-wrap justify-center gap-3">
          {tags.map((t, i) => (
            <span
              key={t}
              className="inline-flex items-center gap-[7px] px-[14px] py-[9px] rounded-[10px] border-2 border-dashed border-white/10 bg-[#141822] text-[12.5px] font-medium text-[#AEB7C7]"
            >
              <span className="text-[#1EA1FE] font-bold">
                {String(i + 1).padStart(2, '0')}
              </span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
