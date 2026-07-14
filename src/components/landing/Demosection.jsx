const manualItems = [
  { label: 'Print 30+ papers', time: '15 min' },
  { label: 'Mark each by hand', time: '4+ hours' },
  { label: 'Calculate totals', time: '30 min' },
  { label: 'Record in spreadsheet', time: '45 min' },
  { label: 'Identify weak learners', time: 'guesswork' },
  { label: 'Prepare feedback', time: '1+ hour' },
]

const eduketItems = [
  { label: 'Upload scanned papers', time: '30 sec' },
  { label: 'AI marks every script', time: '90 sec' },
  { label: 'Totals calculated', time: 'instant' },
  { label: 'Synced to gradebook', time: 'instant' },
  { label: 'Concept gaps flagged', time: 'automatic' },
  { label: 'Personal study plan', time: 'generated' },
]

export default function Demosection() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-[#0A0D14] border-b border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="font-plex-mono text-[13px] font-semibold uppercase tracking-[0.15em] text-[#1EA1FE] block mb-4">
            • BEFORE VS AFTER
          </span>
          <h2 className="font-zilla text-3xl sm:text-4xl font-bold text-[#F3F6FB] tracking-tight">
            See the{' '}
            <span className="font-caveat text-[#4BB8FF]" style={{ fontSize: '1.18em', transform: 'rotate(-2deg)' }}>
              difference.
            </span>
          </h2>
          <p className="font-plex-sans text-[16px] text-[#AEB7C7] leading-[1.6] max-w-[580px] mx-auto mb-[56px]">
            This used to take a teacher an entire weekend. Now it takes two minutes.
          </p>
        </div>

        <div className="flex items-center justify-center gap-7 mb-12 flex-wrap">
          <div className="w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center border border-red-400/50">
            <span className="font-plex-mono text-[20px] font-medium text-[#f87171]">~7 hrs</span>
            <span className="text-[11px] text-[#6C7484] mt-1">manual marking</span>
          </div>
          <span className="font-plex-mono text-[20px] text-[#6C7484]">→</span>
          <div className="w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center border border-green-400/50">
            <span className="font-plex-mono text-[20px] font-medium text-[#4ade80]">2 min</span>
            <span className="text-[11px] text-[#6C7484] mt-1">eduket os</span>
          </div>
        </div>

        <div className="max-w-[900px] mx-auto bg-[#141822] border border-[#232c3d] rounded-[14px] overflow-hidden shadow-2xl shadow-black/50">
          <div className="flex items-center gap-[14px] px-4 py-3 bg-[#0d111a] border-b border-[#232c3d]">
            <div className="flex gap-[6px]">
              <span className="w-[9px] h-[9px] rounded-full bg-[#2E3648]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#2E3648]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#2E3648]" />
            </div>
            <span className="font-plex-sans text-[11px] font-semibold text-[#AEB7C7] ml-2">Marking Workflow</span>
          </div>

          <div className="grid grid-cols-2 saturate-[0.75]">
            <div className="border-r border-[#232c3d]">
              <div className="px-[22px] py-[14px] font-plex-mono text-[11px] uppercase tracking-[.06em] text-[#f87171] border-b border-[#232c3d]">
                manual marking
              </div>
              {manualItems.map(({ label, time }) => (
                <div
                  key={label}
                  className="flex justify-between px-[22px] py-[13px] text-[13.5px] text-[#AEB7C7] border-b border-[#232c3d] last:border-b-0"
                >
                  <span>{label}</span>
                  <span className="font-plex-mono text-[12px] text-[#f87171]">{time}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="px-[22px] py-[14px] font-plex-mono text-[11px] uppercase tracking-[.06em] text-[#4ade80] border-b border-[#232c3d]">
                eduket os
              </div>
              {eduketItems.map(({ label, time }) => (
                <div
                  key={label}
                  className="flex justify-between px-[22px] py-[13px] text-[13.5px] text-[#AEB7C7] border-b border-[#232c3d] last:border-b-0"
                >
                  <span>{label}</span>
                  <span className="font-plex-mono text-[12px] text-[#4ade80]">{time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 bg-[#0d111a]">
            <div className="px-4 py-3 font-plex-mono text-[11px] text-center text-[#f87171] border-r border-[#232c3d]">
              total: ~7 hours · feedback delay: days
            </div>
            <div className="px-4 py-3 font-plex-mono text-[11px] text-center text-[#4ade80]">
              total: ~2 minutes · feedback delay: none
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
