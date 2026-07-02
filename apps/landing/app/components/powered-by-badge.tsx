const labelByLocale: Record<string, string> = {
  zh: "支持方",
  ja: "協力",
  ko: "지원",
  es: "Con el apoyo de",
  fr: "Avec le soutien de",
};

const taglineByLocale: Record<string, string> = {
  zh: "Agent Native 的 AI Agent 评测工具",
  ja: "エージェントネイティブな AI エージェント評価ツール",
  ko: "에이전트 네이티브 AI 에이전트 평가 도구",
  es: "Herramienta de evaluación de agentes de IA agent-native",
  fr: "Outil d'évaluation d'agents IA agent-native",
};

export default function PoweredByBadge({ locale }: { locale: string }) {
  const label = labelByLocale[locale] ?? "Supported by";
  const tagline = taglineByLocale[locale] ?? "Agent-native AI agent eval tool";

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
