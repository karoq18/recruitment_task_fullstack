export async function fetchRates(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`/api/rates${q}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

export async function fetchHistory(code, date, days = 14) {
  const params = new URLSearchParams({
    date,
    days: String(days),
  });
  const res = await fetch(`/api/rates/${encodeURIComponent(code)}/history?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}