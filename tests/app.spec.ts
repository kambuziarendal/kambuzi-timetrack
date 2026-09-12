import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const adminEmail = "admin@example.test";
const adminPassword = "Testpassord-1234";

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
  await expect(page.getByRole("button", { name: "Logg inn" })).toBeVisible();
  await page.getByLabel("E-post").fill(adminEmail);
  await page.getByLabel("Passord").fill(adminPassword);
  await page.getByRole("button", { name: "Logg inn" }).click();
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
  await page.getByLabel("E-post").fill(employeeEmail);
  await page.getByLabel("Passord").fill(employeePassword);
  await page.getByRole("button", { name: "Logg inn" }).click();
  await page.getByRole("button", { name: "Før dagens timer" }).click();
  await page.getByLabel("Fra").fill("09:00");
  await page.getByLabel("Til").fill("15:00");
  await page.getByLabel("Pause (min)").fill("30");
  await page.getByRole("button", { name: "Lagre som utkast" }).click();
  await expect(page.getByText("5,50 t")).toBeVisible();
  await page.getByRole("button", { name: "Send inn" }).click();
  await expect(page.getByText("Sendt inn")).toBeVisible();

  await page.getByRole("button", { name: "Logg ut" }).click();
  await page.getByLabel("E-post").fill(adminEmail);
  await page.getByLabel("Passord").fill(adminPassword);
  await page.getByRole("button", { name: "Logg inn" }).click();
  await page.getByRole("button", { name: "Timer" }).click();
  await page.getByRole("button", { name: "Godkjenn" }).click();
  await expect(page.getByText("Godkjent")).toBeVisible();
  await page.getByRole("button", { name: "Rapporter" }).click();
  await page
    .locator(".report-filters select")
    .first()
    .selectOption({ label: `${employeeFirstName} Ansatt` });
  await page.getByRole("button", { name: "Vis rapport" }).click();
  await expect(page.getByText("Totalt: 5,50 timer")).toBeVisible();
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
