export function formatTokens(num) {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat().format(num);
}

export function formatPercent(num) {
  if (num === null || num === undefined) return "0.0%";
  return `${Number(num).toFixed(1)}%`;
}

export function formatCost(usd) {
  if (!usd || usd <= 0) return "$0.00";
  if (usd < 0.01) {
    return `$${Number(usd).toFixed(5)}`;
  }
  return `$${Number(usd).toFixed(3)}`;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) return "0 ms";
  return `${Number(ms).toFixed(1)} ms`;
}

