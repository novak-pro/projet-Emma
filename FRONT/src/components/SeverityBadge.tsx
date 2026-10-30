import { severityLabels, severityStyles } from "../lib/format";
import type { SeverityClass } from "../lib/types";

export function SeverityBadge({ severity }: { severity: SeverityClass | null }) {
  if (!severity) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
        Non analysé
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${severityStyles[severity]}`}
    >
      {severityLabels[severity]}
    </span>
  );
}
