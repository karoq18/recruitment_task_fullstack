import React, { useState, useEffect } from "react";
import { Route, Redirect, Switch } from "react-router-dom";
import RatesTable from "./RatesTable";
import logo from "../../img/logo.svg";

export default function Home() {
  const [theme, setTheme] = useState("dark");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const formattedDate = now.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const formattedTime = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const isDark = theme === "dark";

  return (
    <div className="app-root">
      <header className="tm-nav border-bottom">
        <div className="container-fluid py-3 px-3 px-md-4 d-flex flex-wrap align-items-center justify-content-between gap-3">

          <div className="d-flex align-items-center gap-3">
            <div className="tm-logo d-inline-flex align-items-center justify-content-center">
              <img src={logo} alt="Logo" />
            </div>
            <div className="tm-title-block">
              <h1 className="h4 mb-0 fw-semibold tm-title-text">
                Kantor Panel
              </h1>
              <p className="mb-0 small">
                Bieżące kursy sprzedaży i kupna w kantorze.
              </p>
            </div>
          </div>

          <div className="d-flex flex-column align-items-end gap-2">

            <div className="tm-theme-segment" onClick={toggleTheme}>
              <div className={`tm-segment-item ${!isDark ? "active" : ""}`}>
                {"\u263C"}
              </div>
              <div className={`tm-segment-item ${isDark ? "active" : ""}`}>
                {"\u263E"}
              </div>
            </div>

            <div className="tm-nav-datetime text-end">
              <div className="fw-semibold tm-nav-date">
                {formattedDate}
              </div>
              <div className="tm-nav-time">
                {formattedTime}
              </div>
            </div>

          </div>
        </div>
      </header>

      <main>
        <Switch>
          <Route exact path={["/", "/rates"]}>
            <RatesTable theme={theme} />
          </Route>
          <Redirect to="/" />
        </Switch>
      </main>
    </div>
  );
}
