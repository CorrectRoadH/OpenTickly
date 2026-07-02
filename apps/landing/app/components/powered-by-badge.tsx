const labelByLocale: Record<string, string> = {
  zh: "支持方",
  ja: "協力",
  ko: "지원",
  es: "Con el apoyo de",
  fr: "Avec le soutien de",
};

const taglineByLocale: Record<string, string> = {
  zh: "AI 购物助手评测",
  ja: "AIショッピングエージェントの評価",
  ko: "AI 쇼핑 에이전트 평가",
  es: "Evaluaciones para agentes de compra con IA",
  fr: "Évaluations pour agents d'achat IA",
};

export default function PoweredByBadge({ locale }: { locale: string }) {
  const label = labelByLocale[locale] ?? "Supported by";
  const tagline = taglineByLocale[locale] ?? "AI shopping agent evaluations";

  return (
    <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-[var(--track-text-muted)]">
      <span>{label}</span>
      <a
        href="https://www.niceeval.com"
        target="_blank"
        rel="noopener"
        className="font-semibold text-[var(--track-text)] hover:text-[var(--track-accent-text)]"
      >
        NiceEval
      </a>
      <span className="hidden sm:inline">— {tagline}</span>
    </div>
  );
}
