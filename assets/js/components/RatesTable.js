import React, { useEffect, useState, useMemo } from "react";
import { fetchRates } from "../api";
import HistoryPanel from "./HistoryPanel";

const fmt = v => (v == null ? "—" : Number(v).toFixed(4));
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function RatesTable() {

  const [date, setDate] = useState(todayStr());

  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);

  const [calcMode, setCalcMode] = useState("sell");
  const [calcAmount, setCalcAmount] = useState("");

  useEffect(() => {
    setData(null);
    setErr(null);
    setSelected(null);
    setCalcMode("sell");
    setCalcAmount("");

    let alive = true;

    fetchRates(date)
      .then(d => {
        if (!alive) return;
        setData(d);
      })
      .catch(e => alive && setErr(e));

    return () => {
      alive = false;
    };
  }, [date]);

  const defaultCode = useMemo(() => {
    if (!data || !data.rates || data.rates.length === 0) return null;
    const eur = data.rates.find(r => r.code === "EUR");
    return (eur || data.rates[0]).code;
  }, [data]);

  useEffect(() => {
    if (data && defaultCode && !selected) {
      setSelected(defaultCode);
    }
  }, [data, defaultCode, selected]);

  const fmtDate = iso => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  };

  const baseNote =
    data && data.baseDate !== date
      ? `Brak kursu NBP dla ${fmtDate(date)}. Wczytano ostatni dostępny: ${fmtDate(
        data.baseDate
      )}.`
      : null;

  const handleCardClick = code => {
    setSelected(code);
    setCalcMode("sell");
    setCalcAmount("");
  };

  const effectiveSelected = selected || defaultCode;

  return (
    <div className="rates-page">
      <div className="container-fluid px-3 px-md-4 mt-4">
        {err && (
          <div className="alert alert-danger shadow-sm">
            Nie udało się pobrać danych. Spróbuj odświeżyć stronę.
          </div>
        )}

        {!data && !err && (
          <div className="tm-loading shadow-sm">
            <div
              className="spinner-border spinner-border-sm text-info"
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <div>
              <div className="fw-semibold">Ładowanie kursów NBP…</div>
              <div className="small tm-loading-sub">
                Pobieram aktualną tabelę kursów z API NBP.
              </div>
            </div>
          </div>
        )}

        {data && baseNote && (
          <div className="tm-base-note alert alert-danger mt-3 py-2 px-3 shadow-sm color-red">
            {baseNote}
          </div>
        )}

        {data && (
          <div className="row g-4 mt-3">
          
            <div className="col-12 col-lg-7">
              <section className="tm-section mb-3 tm-rates-sticky">

                <div className="tm-section">
                  <h2 className="tm-section-title"> Kursy na dzień: {fmtDate(date)}</h2>
                  <div className="tm-section-underline"></div>
                </div>

                <div className="tm-grid-cards">
                  {data.rates.map(r => {
                    const isActive = effectiveSelected === r.code;

                    return (
                      <button
                        key={r.code}
                        type="button"
                        className={
                          "tm-currency-card text-start " +
                          (isActive ? "tm-card-active" : "")
                        }
                        onClick={() => handleCardClick(r.code)}
                      >

                        <div className="tm-card-top">
                          <div className="tm-card-title">
                            <div className="tm-card-code h5 mb-0 fw-semibold">
                              {r.code}
                            </div>
                            <div className="tm-card-name small text-capitalize">
                              {r.name}
                            </div>
                          </div>
                          <div className="tm-chip-wrapper">
                            <span
                              className={
                                "tm-chip " +
                                (isActive ? "tm-chip--active" : "")
                              }
                            >
                              {isActive ? "Aktywna" : "Kliknij aby wybrać"}
                            </span>
                          </div>
                        </div>

                        <div className="tm-card-rates">
                          <div className="tm-card-rate tm-card-rate--buy">
                            <div className="tm-card-rate-label">Kupno</div>
                            <div className="tm-card-rate-value tm-buy">
                              {fmt(r.buy)}
                            </div>
                          </div>
                          <div className="tm-card-rate tm-card-rate--sell">
                            <div className="tm-card-rate-label">Sprzedaż</div>
                            <div className="tm-card-rate-value tm-sell">
                              {fmt(r.sell)}
                            </div>
                          </div>
                        </div>

                        <div className="tm-card-bottom">
                          {isActive ? (
                            <InlineCalculator
                              rate={r}
                              mode={calcMode}
                              onModeChange={setCalcMode}
                              amount={calcAmount}
                              onAmountChange={setCalcAmount}
                            />
                          ) : (
                            <div className="tm-card-bottom-item">
                              <div className="tm-card-bottom-label small">
                                Kurs średni NBP
                              </div>
                              <div className="tm-card-bottom-value">
                                {fmt(r.mid)}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="col-12 col-lg-5">
              <section className="tm-section h-100">
                <div className="tm-section">
                  <h2 className="tm-section-title">Historia kursu waluty</h2>
                  <div className="tm-section-underline"></div>
                </div>

                <div className="tm-history-wrapper rounded-4">
                  {effectiveSelected && (
                    <HistoryPanel
                      code={effectiveSelected}
                      date={date}              
                      onClose={() => setSelected(null)}
                      onChangeDate={setDate}   
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InlineCalculator({
  rate,
  mode,
  onModeChange,
  amount,
  onAmountChange
}) {
  if (!rate) return null;

  const canBuy = rate.code === "EUR" || rate.code === "USD";
  const options = canBuy ? ["buy", "sell"] : ["sell"];
  const effectiveMode = options.includes(mode) ? mode : options[0];

  const activeRate =
    effectiveMode === "buy" && canBuy ? rate.buy : rate.sell;

  const parsedAmount = parseFloat(
    (amount || "").toString().replace(",", ".")
  );

  const plnValue =
    !isNaN(parsedAmount) && activeRate != null
      ? (parsedAmount * Number(activeRate)).toFixed(2)
      : null;

  const stop = e => {
    e.stopPropagation();
  };

  return (
    <div
      className="tm-inline-calculator"
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
    >
      <div className="tm-inline-calculator-row">
        <select
          className="form-select form-select-sm tm-inline-select"
          value={effectiveMode}
          onChange={e => onModeChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt === "buy" ? "Kup" : "Sprzedaj"}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control form-control-sm tm-inline-amount"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder={`Ilość ${rate.code}`}
        />
      </div>

      <div className="tm-inline-result small mt-1">
        {plnValue != null ? (
          <>
            ≈ <strong>{plnValue} PLN</strong>
          </>
        ) : (
          <span className="text-muted">
            Wpisz ilość, aby przeliczyć na PLN
          </span>
        )}
      </div>

      {!canBuy && (
        <div className="tm-inline-note text-muted small mt-1">
          Brak możliwości kupna waluty
        </div>
      )}
    </div>
  );
}
