import { pillClass } from "./ui";

type Props = {
  active: "semua" | "jajanan" | "jasa";
  onChange: (value: "semua" | "jajanan" | "jasa") => void;
};

const OPTIONS: { value: "semua" | "jajanan" | "jasa"; label: string }[] = [
  { value: "semua", label: "🍽️ Semua" },
  { value: "jajanan", label: "🍜 Jajanan" },
  { value: "jasa", label: "🛠️ Jasa" },
];

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-slate-400 text-xs mr-1">
        <i className="fa-solid fa-sliders mr-1"></i>Filter:
      </span>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={pillClass(active === opt.value)}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
