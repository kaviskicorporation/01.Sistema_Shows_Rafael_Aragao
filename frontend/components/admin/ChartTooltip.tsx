"use client";

type PayloadItem = {
  value?: number | string;
  name?: string;
  color?: string;
};

type Props = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
  valueLabel?: string;
};

/** Tooltip do Recharts em português, sem o cursor cinza padrão. */
export default function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = "total",
}: Props) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = item?.value ?? "—";
  const heading = label != null && label !== "" ? label : item?.name;

  return (
    <div className="rounded-xl border border-white/12 bg-ink-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      {heading != null && heading !== "" && (
        <p className="text-[11px] uppercase tracking-wider text-white/40">
          {heading}
        </p>
      )}
      <p className="mt-0.5 text-sm font-semibold text-white">
        <span className="text-gold">{value}</span>
        <span className="ml-1.5 font-normal text-white/55">{valueLabel}</span>
      </p>
    </div>
  );
}
