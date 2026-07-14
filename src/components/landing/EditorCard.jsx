export default function EditorCard() {
  return (
    <div className="w-full max-w-3xl mx-auto text-left">
      <div className="bg-[#141822] border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 px-4 py-3 bg-black/20 border-b border-white/5">
          <span className="w-3 h-3 rounded-full bg-[#2E3648]" />
          <span className="w-3 h-3 rounded-full bg-[#2E3648]" />
          <span className="w-3 h-3 rounded-full bg-[#2E3648]" />
          <span className="font-plex-sans text-[11px] font-semibold text-[#AEB7C7] ml-2">Review</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
          {/* Before — student answer */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-plex-mono text-[10px] font-semibold uppercase tracking-wider text-[#AEB7C7]">Student Answer</span>
              <span className="text-[10px] font-plex-mono font-semibold text-[#FF3B5C]">✗ 3 errors</span>
            </div>
            <div className="space-y-2 text-sm font-plex-sans leading-relaxed text-[#F3F6FB]">
              <p>The mitochondria is the powerhouse of the cell because <span className="bg-[#FF3B5C]/20 text-[#FF3B5C] line-through px-0.5 rounded">it produces proteins</span>.</p>
              <p>Photosynthesis occurs in the <span className="bg-[#FF3B5C]/20 text-[#FF3B5C] line-through px-0.5 rounded">mitochondria</span>.</p>
              <p className="mt-3">Water is absorbed by the roots and transported to the leaves.</p>
            </div>
          </div>

          {/* After — corrected */}
          <div className="p-4 sm:p-5 bg-[#1EA1FE]/[0.03]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-plex-mono text-[10px] font-semibold uppercase tracking-wider text-[#AEB7C7]">Marked + Feedback</span>
              <span className="text-[10px] font-plex-mono font-semibold text-[#22C55E]">✓ 7 / 8</span>
            </div>
            <div className="space-y-2 text-sm font-plex-sans leading-relaxed text-[#F3F6FB]">
              <p>The mitochondria is the powerhouse of the cell because <span className="bg-[#22C55E]/20 text-[#22C55E] px-0.5 rounded">it generates ATP through cellular respiration</span>.</p>
              <p>Photosynthesis occurs in the <span className="bg-[#22C55E]/20 text-[#22C55E] px-0.5 rounded">chloroplasts</span>.</p>
              <p className="mt-3">Water is absorbed by the roots and transported to the leaves.</p>
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="font-caveat text-base text-[#1EA1FE]">✓ Misspelling forgiven — "mitochondria" → "mitochondrion" is close enough</p>
                <p className="font-caveat text-base text-[#1EA1FE] mt-1">✓ Partial credit for question 3 (correct concept, incomplete detail)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-plex-mono text-[10px] text-[#22C55E]">● Auto-marked</span>
            <span className="font-plex-mono text-[10px] text-[#AEB7C7]">0.3s</span>
          </div>
          <span className="font-plex-mono text-[10px] text-[#1EA1FE] cursor-default hover:underline">
            Show concept gaps →
          </span>
        </div>
      </div>
    </div>
  )
}
