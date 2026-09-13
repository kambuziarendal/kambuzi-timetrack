import { FormEvent, ReactNode, useEffect, useState } from "react";
import { api, download, setCsrf } from "./api";

type Theme = "light" | "dark";

const initialTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

function setDocumentTheme(theme: Theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#0f1512" : "#17201c");
  if (persist) {
    try {
      window.localStorage.setItem("kambuzi-theme", theme);
    } catch {
      // Private browsing or a locked-down browser may block local storage.
    }
  }
}

function ThemeButton({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={dark ? "Bruk lyst tema" : "Bruk mørkt tema"}
      aria-pressed={dark}
    >
      <span aria-hidden="true">{dark ? "☀" : "◐"}</span>
      <span className="theme-copy">{dark ? "Lyst tema" : "Mørkt tema"}</span>
    </button>
  );
}

function ProductBrand({ asHeading = false }: { asHeading?: boolean }) {
  const content = (
    <>
      <span className="product-brand-wordmark">KAMBUZI</span>
      <span className="product-brand-name">Timeføring</span>
    </>
  );
  return asHeading ? (
    <h1
      className="product-brand product-brand-heading"
      aria-label="Kambuzi Timeføring"
    >
      {content}
    </h1>
  ) : (
    <span className="product-brand" aria-label="Kambuzi Timeføring">
      {content}
    </span>
  );
}

function LegalNotice() {
  return (
    <p className="legal-notice">
      © 2026 Kambuzi · Fri programvare under AGPL-3.0-or-later · Uten garanti ·{" "}
      <a href="https://github.com/kambuziarendal/kambuzi-timetrack">
        Kildekode og lisens
      </a>
    </p>
  );
}

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "EMPLOYEE";
  mustChangePassword?: boolean;
  isActive?: boolean;
  positionId?: string | null;
  positionName?: string | null;
  demoExpiresAt?: string | null;
};
type Entry = {
  id: string;
  userId: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  crossesMidnight: boolean;
  breakMinutes: number;
  totalMinutes: number;
  note?: string;
  status: string;
  rejectionNote?: string;
  processedAt?: string;
  version: number;
  firstName: string;
  lastName: string;
  positionName?: string;
};
type Position = { id: string; name: string; color: string; isActive: boolean };
const today = () => new Date().toLocaleDateString("en-CA");
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const hours = (minutes: number) =>
  (minutes / 60).toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const statusLabel: Record<string, string> = {
  DRAFT: "Utkast",
  SUBMITTED: "Sendt inn",
  APPROVED: "Godkjent",
  LOCKED: "Låst",
  REJECTED: "Må rettes",
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Notice({
  children,
  type = "info",
}: {
  children: ReactNode;
  type?: "info" | "error" | "ok";
}) {
  return (
    <div
      className={`notice ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
function Spinner() {
  return (
    <main className="center">
      <p>Laster Timeføring …</p>
    </main>
  );
}

function Setup({
  done,
  browserSetupAllowed,
  theme,
  onToggleTheme,
}: {
  done: () => void;
  browserSetupAllowed: boolean;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [error, setError] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/setup", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      done();
    } catch (x) {
      setError((x as Error).message);
    }
  };
  return (
    <main className="auth">
      <section className="auth-card">
        <div className="auth-tools">
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
        </div>
        <p className="eyebrow">Førstegangsoppsett</p>
        <ProductBrand asHeading />
        <p>
          Opprett virksomheten og den første administratoren. Ingen data sendes
          til Kambuzi.
        </p>
        {!browserSetupAllowed ? (
          <Notice type="error">
            Oppsettet er ikke fullført. Kjør <code>scripts/bootstrap.sh</code>{" "}
            lokalt på serveren før siden åpnes offentlig.
          </Notice>
        ) : (
          <form onSubmit={submit} className="form-grid">
            <Field label="Virksomhet">
              <input name="companyName" required minLength={2} />
            </Field>
            <Field label="Organisasjonsnummer">
              <input name="orgNumber" inputMode="numeric" />
            </Field>
            <div className="two">
              <Field label="Fornavn">
                <input name="firstName" required />
              </Field>
              <Field label="Etternavn">
                <input name="lastName" required />
              </Field>
            </div>
            <Field label="E-post">
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Passord" hint="Minst 12 tegn">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </Field>
            {error && <Notice type="error">{error}</Notice>}
            <button className="primary">Fullfør oppsett</button>
          </form>
        )}
        <LegalNotice />
      </section>
    </main>
  );
}
function Login({
  onLogin,
  demo,
  accessNotice,
  theme,
  onToggleTheme,
}: {
  onLogin: (u: User) => void;
  demo: { enabled: boolean; durationHours: number };
  accessNotice?: string;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [error, setError] = useState("");
  const [demoMessage, setDemoMessage] = useState("");
  const [demoSending, setDemoSending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ csrfToken: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      setCsrf(r.csrfToken);
      onLogin(r.user);
    } catch (x) {
      setError((x as Error).message);
    }
  };
  const requestDemo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setDemoMessage("");
    setDemoSending(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const response = await api<{ message: string }>("/demo/request", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          accepted: f.get("accepted") === "on",
          website: f.get("website"),
        }),
      });
      setDemoMessage(response.message);
      form.reset();
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setDemoSending(false);
    }
  };
  return (
    <main className="auth">
      <section className={`auth-card ${demo.enabled ? "auth-card-demo" : ""}`}>
        <div className="auth-tools">
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
        </div>
        <p className="eyebrow">Selvhostet og gratis</p>
        <ProductBrand asHeading />
        <p>Før timer. Send inn. Godkjenn. Eksporter.</p>
        {demo.enabled && (
          <section
            className="demo-access"
            aria-labelledby="demo-access-heading"
          >
            <p className="eyebrow">Prøv selv</p>
            <h2 id="demo-access-heading">
              Privat demo i {demo.durationHours} timer
            </h2>
            <p>
              Du får en engangslenke på e-post. Du ser bare dine egne
              registreringer, og kontoen med alle data i demoen slettes
              automatisk.
            </p>
            {accessNotice && <Notice type="error">{accessNotice}</Notice>}
            <form onSubmit={requestDemo} className="form-grid">
              <Field label="Navn">
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  required
                />
              </Field>
              <Field label="E-post">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
              <label className="demo-consent">
                <input name="accepted" type="checkbox" required />
                <span>
                  Jeg godtar at navn, e-post og demodata lagres i Timeføring i
                  maksimalt {demo.durationHours} timer.
                </span>
              </label>
              <label className="demo-honeypot" aria-hidden="true">
                Nettsted
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              {demoMessage && <Notice type="ok">{demoMessage}</Notice>}
              {error && <Notice type="error">{error}</Notice>}
              <button className="primary" disabled={demoSending}>
                {demoSending ? "Sender …" : "Send meg demolenken"}
              </button>
            </form>
          </section>
        )}
        <details className="existing-login" open={!demo.enabled}>
          <summary>
            {demo.enabled ? "Har du allerede en fast konto?" : "Logg inn"}
          </summary>
          <form onSubmit={submit} className="form-grid">
            <Field label="E-post">
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Passord">
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            {!demo.enabled && error && <Notice type="error">{error}</Notice>}
            <button className="primary">Logg inn</button>
          </form>
        </details>
        <LegalNotice />
      </section>
    </main>
  );
}

function Shell({
  user,
  onLogout,
  children,
  page,
  setPage,
  theme,
  onToggleTheme,
}: {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  page: string;
  setPage: (p: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const nav =
    user.role === "ADMIN"
      ? [
          ["oversikt", "Oversikt"],
          ["timer", "Timer"],
          ["ansatte", "Ansatte"],
          ["rapporter", "Rapporter"],
          ["oppsett", "Oppsett"],
        ]
      : [
          ["oversikt", "Oversikt"],
          ["ny", "Før timer"],
          ["timer", "Mine timer"],
        ];
  const pageTitle = nav.find(([id]) => id === page)?.[1] ?? "Timeføring";
  return (
    <>
      <header>
        <button
          className="brand"
          onClick={() => setPage("oversikt")}
          aria-label="Oversikt"
        >
          <ProductBrand />
        </button>
        <div className="header-actions">
          <span className="user-name">{user.firstName}</span>
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
          <button className="quiet" onClick={onLogout}>
            Logg ut
          </button>
        </div>
      </header>
      <nav aria-label="Hovedmeny">
        {nav.map(([id, label]) => (
          <button
            key={id}
            className={page === id ? "active" : ""}
            onClick={() => setPage(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="app">
        <h1 className="sr-only">{pageTitle}</h1>
        {children}
      </main>
    </>
  );
}
function PasswordBanner({ done }: { done: () => void }) {
  const [open, setOpen] = useState(false),
    [msg, setMsg] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/auth/password", {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      setMsg("Passordet er oppdatert.");
      setOpen(false);
      done();
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  return (
    <Notice type={msg.startsWith("Passordet") ? "ok" : "info"}>
      <strong>Bytt startpassordet før videre bruk.</strong>{" "}
      <button className="link" onClick={() => setOpen(!open)}>
        Bytt nå
      </button>
      {open && (
        <form className="inline-form" onSubmit={submit}>
          <input
            name="currentPassword"
            type="password"
            placeholder="Nåværende passord"
            required
          />
          <input
            name="newPassword"
            type="password"
            minLength={12}
            placeholder="Nytt passord, minst 12 tegn"
            required
          />
          <button>Oppdater</button>
        </form>
      )}
      {msg && <p>{msg}</p>}
    </Notice>
  );
}

function EntryForm({
  user,
  users = [],
  done,
}: {
  user: User;
  users?: User[];
  done: () => void;
}) {
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const data = Object.fromEntries(f);
    try {
      await api("/time-entries", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          breakMinutes: Number(data.breakMinutes),
        }),
      });
      done();
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="card">
      <h2>Før timer</h2>
      <p>Sluttid før start tolkes som arbeid over midnatt.</p>
      <form onSubmit={submit} className="entry-form">
        {user.role === "ADMIN" && (
          <Field label="Ansatt">
            <select name="userId" required>
              {users
                .filter((u) => u.isActive)
                .map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Dato">
          <input
            name="date"
            type="date"
            max={today()}
            defaultValue={today()}
            required
          />
        </Field>
        <div className="three">
          <Field label="Fra">
            <input name="start" type="time" step="300" required />
          </Field>
          <Field label="Til">
            <input name="end" type="time" step="300" required />
          </Field>
          <Field label="Pause (min)">
            <input
              name="breakMinutes"
              type="number"
              min="0"
              max="720"
              defaultValue="0"
              required
            />
          </Field>
        </div>
        <Field label="Notat (valgfritt)">
          <textarea name="note" maxLength={200} rows={2} />
        </Field>
        {error && <Notice type="error">{error}</Notice>}
        <button className="primary" disabled={saving}>
          {saving ? "Lagrer …" : "Lagre som utkast"}
        </button>
      </form>
    </section>
  );
}
function EntryList({
  user,
  refresh = 0,
  onChange,
}: {
  user: User;
  refresh?: number;
  onChange: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [rejecting, setRejecting] = useState<string | null>(null),
    [deleting, setDeleting] = useState<string | null>(null),
    [limit, setLimit] = useState(100);
  useEffect(() => {
    api<Entry[]>(`/time-entries?limit=${limit}`)
      .then(setEntries)
      .catch((x) => setError(x.message));
  }, [refresh, limit]);
  const act = async (path: string, method = "POST", body?: unknown) => {
    try {
      await api(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      setEditing(null);
      setRejecting(null);
      setDeleting(null);
      onChange();
    } catch (x) {
      setError((x as Error).message);
    }
  };
  const save = async (e: Entry, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    await act(`/time-entries/${e.id}`, "PUT", {
      date: f.get("date"),
      start: f.get("start"),
      end: f.get("end"),
      breakMinutes: Number(f.get("breakMinutes")),
      note: f.get("note"),
      version: e.version,
      userId: e.userId,
    });
  };
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>{user.role === "ADMIN" ? "Alle timer" : "Mine timer"}</h2>
          <p>{entries.length} registreringer</p>
        </div>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {!entries.length ? (
        <p className="empty">Ingen timer er registrert ennå.</p>
      ) : (
        <div className="entry-list">
          {entries.map((e) => (
            <article className="entry" key={e.id}>
              {editing === e.id ? (
                <form
                  className="edit-entry"
                  onSubmit={(event) => save(e, event)}
                >
                  <Field label="Dato">
                    <input
                      name="date"
                      type="date"
                      max={today()}
                      defaultValue={e.date}
                      required
                    />
                  </Field>
                  <Field label="Fra">
                    <input
                      name="start"
                      type="time"
                      defaultValue={clock(e.startMinutes)}
                      required
                    />
                  </Field>
                  <Field label="Til">
                    <input
                      name="end"
                      type="time"
                      defaultValue={clock(e.endMinutes)}
                      required
                    />
                  </Field>
                  <Field label="Pause">
                    <input
                      name="breakMinutes"
                      type="number"
                      min="0"
                      max="720"
                      defaultValue={e.breakMinutes}
                      required
                    />
                  </Field>
                  <Field label="Notat">
                    <input
                      name="note"
                      maxLength={200}
                      defaultValue={e.note ?? ""}
                    />
                  </Field>
                  <div className="actions">
                    <button className="primary">Lagre</button>
                    <button type="button" onClick={() => setEditing(null)}>
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <strong>
                      {e.firstName} {e.lastName}
                    </strong>
                    <span>
                      {e.date} · {clock(e.startMinutes)}–{clock(e.endMinutes)}
                      {e.crossesMidnight ? " (+1 dag)" : ""}
                    </span>
                    <small>{e.note || "Uten notat"}</small>
                    {e.rejectionNote && (
                      <small className="danger">{e.rejectionNote}</small>
                    )}
                  </div>
                  <div className="entry-meta">
                    <b>{hours(e.totalMinutes)} t</b>
                    <span className={`status ${e.status.toLowerCase()}`}>
                      {statusLabel[e.status] ?? e.status}
                    </span>
                  </div>
                  <div className="actions">
                    {((user.role === "EMPLOYEE" &&
                      ["DRAFT", "REJECTED"].includes(e.status)) ||
                      (user.role === "ADMIN" && e.status !== "LOCKED")) && (
                      <button onClick={() => setEditing(e.id)}>Rediger</button>
                    )}
                    {user.role === "EMPLOYEE" &&
                      ["DRAFT", "REJECTED"].includes(e.status) && (
                        <>
                          <button
                            onClick={() => act(`/time-entries/${e.id}/submit`)}
                          >
                            Send inn
                          </button>
                          <button
                            className="danger-button"
                            onClick={() => setDeleting(e.id)}
                          >
                            Slett
                          </button>
                        </>
                      )}
                    {user.role === "ADMIN" && e.status === "SUBMITTED" && (
                      <>
                        <button
                          onClick={() =>
                            act(`/admin/time-entries/${e.id}/approve`)
                          }
                        >
                          Godkjenn
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => setRejecting(e.id)}
                        >
                          Send tilbake
                        </button>
                      </>
                    )}
                  </div>
                  {deleting === e.id && (
                    <div className="inline-confirm" role="alert">
                      <p>
                        <strong>Slette dette utkastet?</strong> Handlingen kan
                        ikke angres.
                      </p>
                      <div className="actions">
                        <button
                          className="danger-button"
                          onClick={() => act(`/time-entries/${e.id}`, "DELETE")}
                        >
                          Ja, slett utkastet
                        </button>
                        <button onClick={() => setDeleting(null)}>
                          Avbryt
                        </button>
                      </div>
                    </div>
                  )}
                  {rejecting === e.id && (
                    <form
                      className="inline-confirm"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const reason = new FormData(event.currentTarget).get(
                          "reason",
                        );
                        return act(
                          `/admin/time-entries/${e.id}/reject`,
                          "POST",
                          { reason },
                        );
                      }}
                    >
                      <Field label="Hva må den ansatte rette?">
                        <textarea
                          name="reason"
                          minLength={2}
                          maxLength={500}
                          rows={2}
                          required
                          autoFocus
                        />
                      </Field>
                      <div className="actions">
                        <button className="danger-button">Send tilbake</button>
                        <button
                          type="button"
                          onClick={() => setRejecting(null)}
                        >
                          Avbryt
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </article>
          ))}
          {entries.length === limit && limit < 500 && (
            <button onClick={() => setLimit((current) => current + 100)}>
              Vis flere registreringer
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Overview({
  user,
  setPage,
}: {
  user: User;
  setPage: (p: string) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (user.role === "ADMIN")
      api("/admin/overview")
        .then(setData)
        .catch((x) => setError((x as Error).message));
  }, [user.role]);
  if (user.role === "EMPLOYEE")
    return (
      <div className="hero-grid">
        <section className="hero">
          <p className="eyebrow">God vakt, {user.firstName}</p>
          <h2 className="hero-title">Timer uten styr</h2>
          <p>
            Før vakten når den er ferdig. Du kan kontrollere alt før du sender
            inn.
          </p>
          <button className="primary" onClick={() => setPage("ny")}>
            Før dagens timer
          </button>
        </section>
        <section className="card">
          <h2>Slik fungerer det</h2>
          <ol>
            <li>Før dato, start, slutt og eventuell pause.</li>
            <li>Kontroller utkastet i Mine timer.</li>
            <li>Send inn til leder når det stemmer.</li>
          </ol>
        </section>
      </div>
    );
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Administrasjon</p>
        <h2 className="hero-title">Det som trenger oppfølging</h2>
        <p>
          Godkjenn timer, hold ansatte oppdatert og eksporter et ryddig
          lønnsgrunnlag.
        </p>
      </section>
      {error && <Notice type="error">{error}</Notice>}
      <div className="stats">
        <button onClick={() => setPage("timer")}>
          <b>{data?.pending ?? "–"}</b>
          <span>timer venter</span>
        </button>
        <button onClick={() => setPage("ansatte")}>
          <b>{data?.users?.active ?? "–"}</b>
          <span>aktive ansatte</span>
        </button>
        <button onClick={() => setPage("rapporter")}>
          <b>{hours(data?.monthMinutes ?? 0)}</b>
          <span>timer denne måneden</span>
        </button>
      </div>
    </>
  );
}
function Employees({
  refresh,
  onChange,
}: {
  refresh: number;
  onChange: () => void;
}) {
  const [users, setUsers] = useState<User[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [msg, setMsg] = useState("");
  const load = () =>
    Promise.all([
      api<User[]>("/admin/users"),
      api<Position[]>("/admin/positions"),
    ]).then(([u, p]) => {
      setUsers(u);
      setPositions(p);
    });
  useEffect(() => {
    load().catch((x) => setMsg((x as Error).message));
  }, [refresh]);
  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const r = await api<{ temporaryPassword: string }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      setMsg(`Startpassord (vises bare nå): ${r.temporaryPassword}`);
      form.reset();
      await load();
      onChange();
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  const update = async (id: string, data: unknown) => {
    try {
      await api(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setMsg("Den ansatte er oppdatert.");
      await load();
      onChange();
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  const reset = async (id: string) => {
    try {
      const r = await api<{ temporaryPassword: string }>(
        `/admin/users/${id}/reset-password`,
        { method: "POST" },
      );
      setMsg(`Nytt startpassord (vises bare nå): ${r.temporaryPassword}`);
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  return (
    <div className="split">
      <section className="card">
        <h2>Ansatte</h2>
        {msg && (
          <Notice type={msg.includes("passord") ? "ok" : "info"}>{msg}</Notice>
        )}
        <div className="entry-list">
          {users.map((u) => (
            <details className="manage-row" key={u.id}>
              <summary>
                <span>
                  <strong>
                    {u.firstName} {u.lastName}
                  </strong>
                  <small>
                    {u.email} · {u.positionName || "Ingen arbeidsrolle"}
                  </small>
                </span>
                <span
                  className={`status ${u.isActive ? "approved" : "rejected"}`}
                >
                  {u.isActive ? "Aktiv" : "Deaktivert"}
                </span>
              </summary>
              <form
                className="form-grid compact"
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  update(u.id, {
                    firstName: f.get("firstName"),
                    lastName: f.get("lastName"),
                    role: f.get("role"),
                    positionId: f.get("positionId") || null,
                  });
                }}
              >
                <div className="two">
                  <Field label="Fornavn">
                    <input
                      name="firstName"
                      defaultValue={u.firstName}
                      required
                    />
                  </Field>
                  <Field label="Etternavn">
                    <input name="lastName" defaultValue={u.lastName} required />
                  </Field>
                </div>
                <Field label="Tilgang">
                  <select name="role" defaultValue={u.role}>
                    <option value="EMPLOYEE">Ansatt</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </Field>
                <Field label="Arbeidsrolle">
                  <select name="positionId" defaultValue={u.positionId ?? ""}>
                    <option value="">Ingen</option>
                    {positions
                      .filter((p) => p.isActive || p.id === u.positionId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.isActive ? "" : " (inaktiv)"}
                        </option>
                      ))}
                  </select>
                </Field>
                <div className="actions">
                  <button className="primary">Lagre</button>
                  <button
                    type="button"
                    onClick={() => update(u.id, { isActive: !u.isActive })}
                  >
                    {u.isActive ? "Deaktiver" : "Aktiver"}
                  </button>
                  <button type="button" onClick={() => reset(u.id)}>
                    Nytt startpassord
                  </button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Ny ansatt</h2>
        <form className="form-grid" onSubmit={create}>
          <div className="two">
            <Field label="Fornavn">
              <input name="firstName" required />
            </Field>
            <Field label="Etternavn">
              <input name="lastName" required />
            </Field>
          </div>
          <Field label="E-post">
            <input name="email" type="email" required />
          </Field>
          <Field label="Tilgang">
            <select name="role">
              <option value="EMPLOYEE">Ansatt</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </Field>
          <Field label="Arbeidsrolle">
            <select name="positionId">
              <option value="">Ingen</option>
              {positions
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <button className="primary">Opprett og lag startpassord</button>
        </form>
      </section>
    </div>
  );
}
function Reports() {
  const now = today(),
    first = now.slice(0, 8) + "01";
  const [from, setFrom] = useState(first),
    [to, setTo] = useState(now),
    [userId, setUserId] = useState(""),
    [positionId, setPositionId] = useState(""),
    [status, setStatus] = useState(""),
    [processed, setProcessed] = useState("all"),
    [data, setData] = useState<any>(null),
    [users, setUsers] = useState<User[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [error, setError] = useState(""),
    [msg, setMsg] = useState("");
  useEffect(() => {
    Promise.all([
      api<User[]>("/admin/users"),
      api<Position[]>("/admin/positions"),
    ])
      .then(([u, p]) => {
        setUsers(u);
        setPositions(p);
      })
      .catch((x) => setError((x as Error).message));
  }, []);
  const query = () => {
    const p = new URLSearchParams({ from, to, processed });
    if (userId) p.set("userIds", userId);
    if (positionId) p.set("positionId", positionId);
    if (status) p.set("status", status);
    return p.toString();
  };
  const load = () => {
    setError("");
    return api(`/reports?${query()}`)
      .then(setData)
      .catch((x) => setError(x.message));
  };
  const lock = async () => {
    try {
      const r = await api<{ locked: number }>(
        "/admin/time-entries/lock-period",
        { method: "POST", body: JSON.stringify({ from, to }) },
      );
      setMsg(`${r.locked} godkjente registreringer ble låst.`);
      await load();
    } catch (x) {
      setError((x as Error).message);
    }
  };
  const mark = async (processedValue: boolean) => {
    const ids = (data?.rows ?? [])
      .filter((row: any) => row.status === "LOCKED")
      .map((row: any) => row.id);
    if (!ids.length) {
      setError("Rapporten inneholder ingen låste registreringer.");
      return;
    }
    try {
      const r = await api<{ updated: number }>(
        "/admin/time-entries/processed",
        {
          method: "POST",
          body: JSON.stringify({ ids, processed: processedValue }),
        },
      );
      setMsg(`${r.updated} registreringer ble oppdatert.`);
      await load();
    } catch (x) {
      setError((x as Error).message);
    }
  };
  return (
    <section className="card">
      <h2>Rapporter og lønnsgrunnlag</h2>
      <p>Filtrer, kontroller og lås perioden før eksport til lønnssystemet.</p>
      <div className="report-filters">
        <Field label="Fra">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Til">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Field label="Ansatt">
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Arbeidsrolle">
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
          >
            <option value="">Alle</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alle</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lønnsbehandlet">
          <select
            value={processed}
            onChange={(e) => setProcessed(e.target.value)}
          >
            <option value="all">Alle</option>
            <option value="no">Nei</option>
            <option value="yes">Ja</option>
          </select>
        </Field>
        <button className="primary" onClick={load}>
          Vis rapport
        </button>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {msg && <Notice type="ok">{msg}</Notice>}
      {data && (
        <>
          <h3>Totalt: {hours(data.totalMinutes)} timer</h3>
          <div className="entry-list">
            {data.rows.map((e: any) => (
              <div className="entry" key={e.id}>
                <span>
                  {e.date} · {e.firstName} {e.lastName} ·{" "}
                  {statusLabel[e.status] ?? e.status}
                </span>
                <b>{hours(e.totalMinutes)} t</b>
              </div>
            ))}
          </div>
          <div className="actions">
            <button onClick={lock}>Lås godkjente i perioden</button>
            <button onClick={() => mark(true)}>
              Marker låste som lønnsbehandlet
            </button>
            <button onClick={() => mark(false)}>Angre lønnsbehandlet</button>
            <button
              onClick={() =>
                download(
                  `/reports/csv?${query()}`,
                  `timeforing-${from}-${to}.csv`,
                )
              }
            >
              Last ned CSV
            </button>
            <button
              onClick={() =>
                download(
                  `/reports/pdf?${query()}`,
                  `timeforing-${from}-${to}.pdf`,
                )
              }
            >
              Last ned PDF
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Settings() {
  const [settings, setSettings] = useState<any>(null),
    [auditRows, setAudit] = useState<any[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [msg, setMsg] = useState("");
  const load = () =>
    Promise.all([
      api("/admin/settings"),
      api<any[]>("/admin/audit"),
      api<Position[]>("/admin/positions"),
    ]).then(([s, a, p]) => {
      setSettings(s);
      setAudit(a);
      setPositions(p);
    });
  useEffect(() => {
    load().catch((x) => setMsg((x as Error).message));
  }, []);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...Object.fromEntries(f),
          payrollStartDay: Number(f.get("payrollStartDay")),
        }),
      });
      setMsg("Oppsettet er lagret.");
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  const createPosition = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/admin/positions", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      form.reset();
      setMsg("Arbeidsrollen er opprettet.");
      await load();
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  const updatePosition = async (p: Position, data: unknown) => {
    try {
      await api(`/admin/positions/${p.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setMsg("Arbeidsrollen er oppdatert.");
      await load();
    } catch (x) {
      setMsg((x as Error).message);
    }
  };
  if (!settings) return <Spinner />;
  return (
    <div className="settings-grid">
      <section className="card">
        <h2>Virksomhet</h2>
        <form className="form-grid" onSubmit={save}>
          <Field label="Navn">
            <input
              name="companyName"
              defaultValue={settings.companyName}
              required
            />
          </Field>
          <Field label="Organisasjonsnummer">
            <input name="orgNumber" defaultValue={settings.orgNumber ?? ""} />
          </Field>
          <Field label="Tidssone">
            <input name="timezone" defaultValue={settings.timezone} required />
          </Field>
          <Field label="Lønnsperiode starter dag">
            <input
              name="payrollStartDay"
              type="number"
              min="1"
              max="28"
              defaultValue={settings.payrollStartDay}
              required
            />
          </Field>
          {msg && (
            <Notice
              type={
                msg.includes("lagret") ||
                msg.includes("opprettet") ||
                msg.includes("oppdatert")
                  ? "ok"
                  : "error"
              }
            >
              {msg}
            </Notice>
          )}
          <button className="primary">Lagre oppsett</button>
        </form>
        <button
          onClick={() =>
            download("/admin/data-export", `timeforing-data-${today()}.json`)
          }
        >
          Last ned persondata og historikk
        </button>
      </section>
      <section className="card">
        <h2>Arbeidsroller</h2>
        <form className="position-form" onSubmit={createPosition}>
          <input
            name="name"
            aria-label="Navn på arbeidsrolle"
            placeholder="F.eks. kjøkken"
            required
          />
          <input
            name="color"
            aria-label="Farge"
            type="color"
            defaultValue="#2563eb"
          />
          <button>Legg til</button>
        </form>
        <div className="entry-list">
          {positions.map((p) => (
            <div className="entry" key={p.id}>
              <span className="color-dot" style={{ background: p.color }} />
              <strong>{p.name}</strong>
              <span
                className={`status ${p.isActive ? "approved" : "rejected"}`}
              >
                {p.isActive ? "Aktiv" : "Inaktiv"}
              </span>
              <button
                onClick={() => updatePosition(p, { isActive: !p.isActive })}
              >
                {p.isActive ? "Skjul" : "Aktiver"}
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="card audit-card">
        <h2>Siste aktivitet</h2>
        <div className="audit-list">
          {auditRows.map((a) => (
            <p key={a.id}>
              <strong>{a.action}</strong>
              <span>
                {new Date(a.createdAt).toLocaleString("nb-NO")} ·{" "}
                {a.actor || "System"}
              </span>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [loading, setLoading] = useState(true),
    [startupError, setStartupError] = useState(""),
    [accessNotice, setAccessNotice] = useState(""),
    [setup, setSetup] = useState(false),
    [browserSetupAllowed, setBrowserSetupAllowed] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [theme, setTheme] = useState<Theme>(initialTheme),
    [page, setPage] = useState("oversikt"),
    [refresh, setRefresh] = useState(0),
    [users, setUsers] = useState<User[]>([]),
    [demo, setDemo] = useState({ enabled: false, durationHours: 24 });
  useEffect(() => setDocumentTheme(theme), [theme]);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setDocumentTheme(next, true);
    setTheme(next);
  };
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const demoToken = hashParams.get("demo_token");
    if (demoToken) {
      hashParams.delete("demo_token");
      const hash = hashParams.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`,
      );
    }
    const authentication = demoToken
      ? api<{ user: User; csrfToken: string }>("/demo/redeem", {
          method: "POST",
          body: JSON.stringify({ token: demoToken }),
        }).catch((error) => {
          setAccessNotice(
            error instanceof Error
              ? error.message
              : "Demolenken kunne ikke brukes.",
          );
          return { user: null, csrfToken: undefined };
        })
      : api<{ user: User | null; csrfToken?: string }>("/auth/session");
    Promise.all([
      api<{ required: boolean; browserSetupAllowed: boolean }>("/setup/status"),
      api<{ enabled: boolean; durationHours: number }>("/demo/status"),
      authentication,
    ])
      .then(([s, d, a]) => {
        setSetup(s.required);
        setBrowserSetupAllowed(s.browserSetupAllowed);
        setDemo(d);
        if (a.csrfToken) setCsrf(a.csrfToken);
        setUser(a.user);
      })
      .catch((error) =>
        setStartupError(
          error instanceof Error ? error.message : "Appen kunne ikke startes.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  const changed = () => setRefresh((x) => x + 1);
  useEffect(() => {
    if (user?.role === "ADMIN")
      api<User[]>("/admin/users")
        .then(setUsers)
        .catch(() => setUsers([]));
  }, [user, refresh]);
  if (loading) return <Spinner />;
  if (startupError)
    return (
      <main className="auth">
        <section className="auth-card">
          <h1>Timeføring er ikke tilgjengelig</h1>
          <Notice type="error">{startupError}</Notice>
          <button className="primary" onClick={() => window.location.reload()}>
            Prøv igjen
          </button>
          <LegalNotice />
        </section>
      </main>
    );
  if (setup)
    return (
      <Setup
        done={() => setSetup(false)}
        browserSetupAllowed={browserSetupAllowed}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  if (!user)
    return (
      <Login
        onLogin={setUser}
        demo={demo}
        accessNotice={accessNotice}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCsrf("");
  };
  let content: ReactNode = <Overview user={user} setPage={setPage} />;
  if (page === "ny")
    content = (
      <EntryForm
        user={user}
        users={users}
        done={() => {
          changed();
          setPage("timer");
        }}
      />
    );
  if (page === "timer")
    content = (
      <>
        <EntryList user={user} refresh={refresh} onChange={changed} />
        {user.role === "ADMIN" && (
          <EntryForm user={user} users={users} done={changed} />
        )}
      </>
    );
  if (page === "ansatte" && user.role === "ADMIN")
    content = <Employees refresh={refresh} onChange={changed} />;
  if (page === "rapporter" && user.role === "ADMIN") content = <Reports />;
  if (page === "oppsett" && user.role === "ADMIN") content = <Settings />;
  return (
    <Shell
      user={user}
      onLogout={logout}
      page={page}
      setPage={setPage}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {user.demoExpiresAt && (
        <Notice>
          Dette er en privat demo. Kontoen og demodataene slettes automatisk{" "}
          {new Date(user.demoExpiresAt).toLocaleString("nb-NO")}.
        </Notice>
      )}
      {user.mustChangePassword && (
        <PasswordBanner
          done={() => setUser({ ...user, mustChangePassword: false })}
        />
      )}{" "}
      {content}
      <footer>
        <LegalNotice />
      </footer>
    </Shell>
  );
}
