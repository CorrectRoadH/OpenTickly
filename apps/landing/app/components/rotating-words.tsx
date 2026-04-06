import { useEffect, useState } from "react";

type RotatingWordsProps = {
  words: readonly string[];
  interval?: number;
};

export function RotatingWords({ words, interval = 2500 }: RotatingWordsProps) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setAnimating(false);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className="inline-grid overflow-hidden whitespace-nowrap align-bottom">
      {/* All words stacked in same grid cell — widest one wins */}
      {words.map((word, i) => (
        <span
          key={word}
          className={`col-start-1 row-start-1 transition-all duration-300 ${
            i === index && !animating
              ? "translate-y-0 opacity-100"
              : i === index && animating
                ? "-translate-y-full opacity-0"
                : "translate-y-full opacity-0"
          } text-[var(--track-accent)]`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
