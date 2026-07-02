const labelByLocale: Record<string, string> = {
  zh: "支持方",
  ja: "協力",
  ko: "지원",
  es: "Con el apoyo de",
  fr: "Avec le soutien de",
};

const taglineByLocale: Record<string, string> = {
  zh: "轻量级 AI Agent 评测工具",
  ja: "軽量な AI エージェント評価ツール",
  ko: "경량 AI 에이전트 평가 도구",
  es: "Framework ligero de evaluación de agentes de IA",
  fr: "Framework léger d'évaluation d'agents IA",
};

export default function PoweredByBadge({ locale }: { locale: string }) {
  const label = labelByLocale[locale] ?? "Supported by";
  const tagline = taglineByLocale[locale] ?? "Lightweight AI agent eval framework";

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
