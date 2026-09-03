type VaultDialProps = {
  progress: number;
  open: boolean;
};

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export function VaultDial({ progress, open }: VaultDialProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <svg
      viewBox="0 0 200 200"
      className="size-full text-fg"
      aria-hidden="true"
    >
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeWidth="1"
      />

      {TICKS.map((i) => {
        const major = i % 5 === 0;
        const angle = (i / 60) * 360;
        return (
          <line
            key={i}
            x1="100"
            y1={major ? 12 : 15}
            x2="100"
            y2={major ? 22 : 19}
            transform={`rotate(${angle} 100 100)`}
            stroke="currentColor"
            strokeWidth={major ? 1.4 : 0.7}
            strokeOpacity={major ? 0.42 : 0.16}
            strokeLinecap="round"
          />
        );
      })}

      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeWidth="3.5"
      />
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 100 100)"
        className="transition-[stroke-dashoffset] duration-[var(--motion-fast)] ease-linear"
      />

      <circle
        cx="100"
        cy="100"
        r="54"
        fill="var(--color-surface)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      <g className={open ? "shackle shackle-open" : "shackle"}>
        <path
          d="M86 96 V84 a14 14 0 0 1 28 0 V96"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      <rect
        x="78"
        y="94"
        width="44"
        height="42"
        rx="8"
        fill="var(--color-surface-2)"
        stroke="var(--color-accent)"
        strokeWidth="2.2"
      />
      <circle cx="100" cy="111" r="4.2" fill="var(--color-accent)" />
      <rect
        x="98.4"
        y="114"
        width="3.2"
        height="9"
        rx="1.4"
        fill="var(--color-accent)"
      />
    </svg>
  );
}
