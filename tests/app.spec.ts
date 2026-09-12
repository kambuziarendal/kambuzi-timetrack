import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const adminEmail = "admin@example.test";
const adminPassword = "Testpassord-1234";

async function logIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await expect(page.getByRole("button", { name: "Logg inn" })).toBeVisible();
  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill(password);
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Logg inn" }).click(),
  ]);
  expect(loginResponse.ok()).toBe(true);
}

test.describe.configure({ mode: "serial" });

test("førstegangsoppsett, admin, ansatt og låst lønnsgrunnlag", async ({
  page,
}, testInfo) => {
  const employeeFirstName = `Ada-${testInfo.project.name}`;
  const employeeEmail = `ada-${testInfo.project.name}@example.test`;
  await page.goto("/");
  if (
    (await page
      .getByRole("heading", { name: "Kambuzi Timeføring" })
      .isVisible()) &&
    (await page.getByText("Førstegangsoppsett").isVisible())
  ) {
    await page.getByLabel("Virksomhet").fill("Testrestauranten");
    await page.getByLabel("Organisasjonsnummer").fill("123456789");
    await page.getByLabel("Fornavn").fill("Admin");
    await page.getByLabel("Etternavn").fill("Bruker");
    await page.getByLabel("E-post").fill(adminEmail);
    await page.getByLabel("Passord").fill(adminPassword);
    await page.getByRole("button", { name: "Fullfør oppsett" }).click();
  }
  await logIn(page, adminEmail, adminPassword);
  await expect(
    page.getByRole("heading", { name: "Det som trenger oppfølging" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Oppsett" }).click();
  await expect(page.getByText("Ansatt", { exact: true }).first()).toBeVisible();
  if (
    !(await page
      .getByText("Kjøkken", { exact: true })
      .first()
      .isVisible()
      .catch(() => false))
  ) {
    await page.getByLabel("Navn på arbeidsrolle").fill("Kjøkken");
    await page.getByRole("button", { name: "Legg til" }).click();
    await expect(page.getByText("Arbeidsrollen er opprettet.")).toBeVisible();
  }

  await page.getByRole("button", { name: "Ansatte" }).click();
  await page.getByLabel("Fornavn").last().fill(employeeFirstName);
  await page.getByLabel("Etternavn").last().fill("Ansatt");
  await page.getByLabel("E-post").last().fill(employeeEmail);
  await page
    .getByLabel("Arbeidsrolle")
    .last()
    .selectOption({ label: "Kjøkken" });
  const [createEmployeeResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/users") &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Opprett og lag startpassord" }).click(),
  ]);
  expect(createEmployeeResponse.ok()).toBe(true);
  const createdEmployee = await createEmployeeResponse.json();
  const passwordNotice = page.getByText(/Startpassord \(vises bare nå\):/);
  await expect(passwordNotice).toBeVisible();
  const employeePassword = createdEmployee.temporaryPassword as string;

  await page.getByRole("button", { name: "Logg ut" }).click();
  await logIn(page, employeeEmail, employeePassword);
  await page.getByRole("button", { name: "Bytt nå" }).click();
  await page.getByPlaceholder("Nåværende passord").fill(employeePassword);
  await page
    .getByPlaceholder("Nytt passord, minst 12 tegn")
    .fill("Ansattpassord-1234");
  await page.getByRole("button", { name: "Oppdater" }).click();
  await expect(page.getByRole("button", { name: "Bytt nå" })).not.toBeVisible();
  await page.getByRole("button", { name: "Før dagens timer" }).click();
  await page.getByLabel("Fra").fill("09:00");
  await page.getByLabel("Til").fill("15:00");
  await page.getByLabel("Pause (min)").fill("30");
  if (testInfo.project.name === "mobile") {
    await page.screenshot({
      path: "artifacts/mobile-employee-entry.png",
    });
  }
  await page.getByRole("button", { name: "Lagre som utkast" }).click();
  await expect(page.getByText("5,50 t")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.screenshot({
      path: "artifacts/mobile-employee-list.png",
    });
  }
  await page.getByRole("button", { name: "Slett", exact: true }).click();
  await expect(page.getByText("Slette dette utkastet?")).toBeVisible();
  await page.getByRole("button", { name: "Avbryt" }).click();
  await expect(page.getByText("Slette dette utkastet?")).not.toBeVisible();
  await page.getByRole("button", { name: "Send inn" }).click();
  await expect(page.getByText("Sendt inn")).toBeVisible();

  await page.getByRole("button", { name: "Logg ut" }).click();
  await logIn(page, adminEmail, adminPassword);
  await page.getByRole("button", { name: "Timer" }).click();
  await page.getByRole("button", { name: "Send tilbake" }).click();
  await expect(page.getByLabel("Hva må den ansatte rette?")).toBeVisible();
  await page.getByRole("button", { name: "Avbryt" }).click();
  await page.getByRole("button", { name: "Godkjenn" }).click();
  await expect(page.getByText("Godkjent")).toBeVisible();
  await page.getByRole("button", { name: "Rapporter" }).click();
  await page
    .locator(".report-filters select")
    .first()
    .selectOption({ label: `${employeeFirstName} Ansatt` });
  await page.getByRole("button", { name: "Vis rapport" }).click();
  await expect(page.getByText("Totalt: 5,50 timer")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.screenshot({
      path: "artifacts/mobile-light-reports.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Bruk mørkt tema" }).click();
    await page.screenshot({
      path: "artifacts/mobile-dark-reports.png",
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Lås godkjente i perioden" }).click();
  await expect(
    page.getByText(/1 godkjente registreringer ble låst/),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  const body = page.locator("body");
  expect(
    await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-admin.png`,
    fullPage: true,
  });
});

test("innlogging har ingen horisontal overflyt eller tilgjengelighetsbrudd", async ({
  page,
}) => {
  await page.goto("/");
  if (
    await page
      .getByRole("button", { name: "Logg ut" })
      .isVisible()
      .catch(() => false)
  )
    await page.getByRole("button", { name: "Logg ut" }).click();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
});

test("mørkt tema følger systemet og lagrer manuelt valg", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  if (
    await page
      .getByRole("button", { name: "Logg ut" })
      .isVisible()
      .catch(() => false)
  )
    await page.getByRole("button", { name: "Logg ut" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Bruk lyst tema" }),
  ).toBeVisible();
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(15, 21, 18)");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);

  await page.getByRole("button", { name: "Bruk lyst tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("kambuzi-theme"))).toBe(
    "light",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(244, 241, 234)");

  await page.getByRole("button", { name: "Bruk mørkt tema" }).click();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-dark-login.png`,
    fullPage: true,
  });
});
