type Props = {
  active: "semua" | "jajanan" | "jasa";
  onChange: (value: "semua" | "jajanan" | "jasa") => void;
};

const OPTIONS: { value: "semua" | "jajanan" | "jasa"; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "jajanan", label: "Jajanan" },
  { value: "jasa", label: "Jasa" },
];

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="filters">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className="chip"
          data-active={active === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
