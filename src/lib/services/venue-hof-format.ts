export function formatHofMetric(value: number, label: string) {
  if (label.includes("cents") || label.toLowerCase().includes("revenue")) {
    return `$${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(1);
}
