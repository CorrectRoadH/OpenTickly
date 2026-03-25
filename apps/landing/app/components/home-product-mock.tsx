import { Camera, ImageIcon } from "lucide-react";

export default function HomeProductMock() {
  return (
    <div className="mt-10 overflow-hidden rounded-[28px] border border-fd-border bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(7,11,18,0.96))] text-left shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs text-white/70">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 font-medium text-white">OpenToggl product screenshot</span>
        <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
          Placeholder
        </span>
      </div>

      <div className="p-4">
        <div className="rounded-[24px] border border-dashed border-white/15 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 md:p-8">
          <div className="aspect-[16/9] rounded-[20px] border border-white/10 bg-black/20">
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
                  <ImageIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
                  <Camera className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-white md:text-2xl">
                  Real product screenshot goes here
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
                  Replace this block with an actual screenshot from the OpenToggl app once one is
                  ready. The homepage should show the real product, not a mocked UI.
                </p>
              </div>
              <div className="rounded-full border border-fd-border bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                Recommended: capture from `track.opentoggl.com`
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
