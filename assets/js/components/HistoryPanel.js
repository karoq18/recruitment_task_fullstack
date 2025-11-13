import React, { useEffect, useState, useMemo } from "react";
import Sparkline from "./Sparkline";
import { fetchHistory } from "../api";

export default function HistoryPanel({ code, date, onChangeDate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setErr(null);

    fetchHistory(code, date, 14)
      .then(d => {
        if (alive) setData(d);
      })
      .catch(e => {
        if (alive) setErr(e);
      });

    return () => {
      alive = false;
    };
  }, [code, date]);

  const baseDate = data?.baseDate || date;

  const sellVals = useMemo(() => {
    if (!data || !Array.isArray(data.history)) return [];
    return data.history
      .map(h => Number(h.sell))
      .filter(v => Number.isFinite(v));
  }, [data]);

  const first = sellVals[0];
  const last = sellVals[sellVals.length - 1];
  const diff = sellVals.length > 1 ? last - first : 0;
  const diffPct = first ? (diff / first) * 100 : 0;

  let trendLabel = "Stabilny kurs";
  let trendClass = "tm-trend-neutral";
  let trendSymbol = "—";

  if (diff > 0) {
    trendLabel = `Wzrost o ${diff.toFixed(4)} (${diffPct.toFixed(1)}%)`;
    trendClass = "tm-trend-up";
    trendSymbol = "▲";
  } else if (diff < 0) {
    trendLabel = `Spadek o ${Math.abs(diff).toFixed(4)} (${Math.abs(
      diffPct
    ).toFixed(1)}%)`;
    trendClass = "tm-trend-down";
    trendSymbol = "▼";
  }

  const rows = data?.history ? data.history.slice().reverse() : [];

  const minSell =
    sellVals.length > 0 ? Math.min.apply(null, sellVals) : null;
  const maxSell =
    sellVals.length > 0 ? Math.max.apply(null, sellVals) : null;

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  };


  const renderHeader = () => (
    <header className="tm-history-header d-flex justify-content-between align-items-start gap-3">

      <div>
        <div className="tm-history-title-row">
          <h3 className="tm-history-title mb-0">{code}</h3>
          <span className="tm-history-code-pill">
            {data?.name || code}
          </span>
        </div>
        <div className="tm-history-sub small">
          Historia sprzedaży z ostatnich{" "}
          <strong>14 dni</strong>
          do{" "}<strong>{fmtDate(baseDate)}</strong>
          </div>
        </div>

      <div className="">
        <div className="">
          <div className="tm-history-sub small text-center">
            Data kursu NBP
          </div>
          <div>
          <input
            id="history-date"
            type="date"
            className="form-control form-control-sm tm-date-input"
            value={date}
            onChange={e =>
              onChangeDate && onChangeDate(e.target.value)
            }
          />
          </div>
        </div>
      </div>
    </header>
  );

  if (err) {
    return (
      <section
        className="tm-history-inner"
        aria-live="polite"
        aria-atomic="true"
      >
        {renderHeader()}
        <div className="mt-3 small text-danger">
          Błąd ładowania historii kursów. Spróbuj ponownie później.
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section
        className="tm-history-inner"
        aria-busy="true"
        aria-live="polite"
        aria-atomic="true"
      >
        {renderHeader()}
        <div className="tm-history-loading small">
          <div
            className="spinner-border spinner-border-sm text-info"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Ładowanie historii kursów…</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="tm-history-inner"
      aria-live="polite"
      aria-atomic="true"
    >
      {renderHeader()}

      <div className="tm-history-top">
        <div className="tm-trend-block">
          <div className={`tm-trend-icon ${trendClass}`}>
            <span>{trendSymbol}</span>
          </div>
          <div className="tm-trend-text small">
            <div className="tm-trend-label">
              Trend kursu sprzedaży
            </div>
            <div className={`tm-trend-value ${trendClass}`}>
              {sellVals.length > 1
                ? trendLabel
                : "Za mało danych do określenia trendu"}
            </div>
          </div>
        </div>

        <div className="tm-sparkline">
          <Sparkline values={sellVals} />
        </div>
      </div>

      <div className="tm-history-stats row g-2 mb-3 mt-3">
        <div className="col-6 text-center">
          <div className="tm-card-rate">
            <div className="tm-stat-label small">Min. cena sprzedaży</div>
            <div>
              <strong>{minSell != null ? minSell.toFixed(4) : "—"} PLN</strong>
            </div>
          </div>
        </div>
        <div className="col-6 text-center">
          <div className="tm-card-rate">
            <div className="tm-stat-label small">Max. cena sprzedaży</div>
            <div>
             <strong>{maxSell != null ? maxSell.toFixed(4) : "—"} PLN</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="tm-history-list mt-2">
        <div className="tm-history-row tm-history-header-row small">
          <div>Data</div>
          <div>NBP</div>
          <div>Kupno</div>
          <div>Sprzedaż</div>
        </div>

        {rows.map(row => (
          <div className="tm-history-row small" key={row.date}>
            <div className="tm-history-cell tm-history-date">
              {fmtDate(row.date)}
            </div>
            <div className="tm-history-cell">
              {row.mid != null ? Number(row.mid).toFixed(4) : "—"}
            </div>
            <div className="tm-history-cell">
              {row.buy == null ? "—" : Number(row.buy).toFixed(4)}
            </div>
            <div className="tm-history-cell">
              {row.sell != null ? Number(row.sell).toFixed(4) : "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
