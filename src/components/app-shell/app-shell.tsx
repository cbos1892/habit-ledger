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

function SignOutForm() {
  return (
    <form action="/auth/sign-out" method="post">
      <button className="sign-out-button" type="submit">
        Sign out
      </button>
    </form>
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
        <SignOutForm />
      </header>

      <aside className="app-navigation-frame">
        <div className="desktop-brand">
          <Brand />
        </div>
        <PrimaryNavigation />
        <div className="desktop-footer">
          <p className="desktop-note">A quiet place for steady progress.</p>
          <SignOutForm />
        </div>
      </aside>

      <main className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
