// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
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
              ? { required: true }
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
