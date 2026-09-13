// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  document.documentElement.removeAttribute("data-theme");
});
it("tilbyr en tidsbegrenset demo uten å sende passord", async () => {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, _options?: RequestInit) => {
      const url = String(input);
      if (url.includes("/setup/status"))
        return new Response(JSON.stringify({ required: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      if (url.includes("/demo/status"))
        return new Response(
          JSON.stringify({ enabled: true, durationHours: 24 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      if (url.includes("/demo/request"))
        return new Response(
          JSON.stringify({ message: "Sjekk e-posten din." }),
          { status: 202, headers: { "content-type": "application/json" } },
        );
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Privat demo i 24 timer" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Navn"), {
    target: { value: "Nora Demo" },
  });
  fireEvent.change(screen.getAllByLabelText("E-post")[0]!, {
    target: { value: "nora@example.test" },
  });
  fireEvent.click(
    screen.getByLabelText(/Jeg godtar at navn, e-post og demodata/),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send meg demolenken" }));
  expect(await screen.findByText("Sjekk e-posten din.")).toBeTruthy();
  const request = fetchMock.mock.calls.find(([url]) =>
    String(url).includes("/demo/request"),
  );
  expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
    name: "Nora Demo",
    email: "nora@example.test",
    accepted: true,
  });
});
it("løser inn engangslenken og fjerner tokenet fra nettleseradressen", async () => {
  window.history.replaceState(
    {},
    "",
    "/#demo_token=hemmelig-engangstoken-som-er-langt-nok",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/setup/status")
        ? { required: false }
        : url.includes("/demo/status")
          ? { enabled: true, durationHours: 24 }
          : {
              csrfToken: "csrf",
              user: {
                id: "demo-id",
                email: "nora@example.test",
                firstName: "Nora",
                lastName: "",
                role: "EMPLOYEE",
                demoExpiresAt: "2026-09-14T12:00:00Z",
              },
            };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  render(<App />);
  expect(await screen.findByText(/Dette er en privat demo/)).toBeTruthy();
  expect(window.location.hash).toBe("");
});
it("viser en brukt eller utløpt demolenke uten å skjule ny registrering", async () => {
  window.history.replaceState(
    {},
    "",
    "/#demo_token=hemmelig-engangstoken-som-er-langt-nok",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/setup/status"))
        return new Response(JSON.stringify({ required: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      if (url.includes("/demo/status"))
        return new Response(
          JSON.stringify({ enabled: true, durationHours: 24 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      if (url.includes("/demo/redeem"))
        return new Response(
          JSON.stringify({ message: "Lenken er brukt eller utløpt." }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  render(<App />);
  expect(await screen.findByText("Lenken er brukt eller utløpt.")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Send meg demolenken" }),
  ).toBeTruthy();
  expect(window.location.hash).toBe("");
});
it("viser innlogging uten eksterne kall når installasjonen er satt opp", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify(
            String(input).includes("/setup/status")
              ? { required: false }
              : { user: null },
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ),
  );
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Kambuzi Timeføring" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Logg inn" })).toBeTruthy();
});
it("viser førstegangsoppsett på tom installasjon", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify(
            String(input).includes("/setup/status")
              ? { required: true, browserSetupAllowed: true }
              : { user: null },
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ),
  );
  render(<App />);
  expect(await screen.findByText("Førstegangsoppsett")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Fullfør oppsett" })).toBeTruthy();
});
it("bytter tema og lagrer brukerens valg", async () => {
  document.documentElement.dataset.theme = "light";
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify(
            String(input).includes("/setup/status")
              ? { required: false }
              : { user: null },
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ),
  );
  render(<App />);
  const toggle = await screen.findByRole("button", { name: "Bruk mørkt tema" });
  fireEvent.click(toggle);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(window.localStorage.getItem("kambuzi-theme")).toBe("dark");
  expect(screen.getByRole("button", { name: "Bruk lyst tema" })).toBeTruthy();
});
it("viser en tydelig feil når serveren ikke er tilgjengelig", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Promise.reject(new Error("Nettverket svarer ikke."))),
  );
  render(<App />);
  expect(
    await screen.findByRole("heading", {
      name: "Timeføring er ikke tilgjengelig",
    }),
  ).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain(
    "Nettverket svarer ikke.",
  );
  expect(screen.getByRole("button", { name: "Prøv igjen" })).toBeTruthy();
});
