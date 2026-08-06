import { PrimaryNavigation } from "./navigation";

function Brand() {
  return (
    <div className="brand" aria-label="Habit Ledger">
      <span className="brand-mark" aria-hidden="true">
        H
      </span>
      <span>Habit Ledger</span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="mobile-header">
        <Brand />
        <span className="privacy-pill">
          <span className="privacy-dot" aria-hidden="true" />
          Private
        </span>
      </header>

      <aside className="app-navigation-frame">
        <div className="desktop-brand">
          <Brand />
        </div>
        <PrimaryNavigation />
        <p className="desktop-note">A quiet place for steady progress.</p>
      </aside>

      <main className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
