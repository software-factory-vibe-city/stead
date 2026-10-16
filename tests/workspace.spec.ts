import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page, isMobile }) => {
  await page.route("https://api.zippopotam.us/**", (route) =>
    route.fulfill({
      json: {
        places: [{ "place name": "Charlotte", "state abbreviation": "NC" }],
      },
    }),
  );
  await page.goto("/");
  if (isMobile)
    await page.getByRole("button", { name: "Edit all assumptions" }).click();
});

test("models live values, changes down-payment units, and validates inputs", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "The big picture" }),
  ).toBeVisible();
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    "$478",
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Yearly", exact: true }).click();
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    "$5,731",
  );
  await page
    .locator(".mini-toggle")
    .getByRole("button", { name: "$", exact: true })
    .click();
  await expect(page.getByLabel("Down payment amount")).toHaveValue("65000");
  await page.getByLabel("Down payment amount").fill("325000");
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    "$25,452",
  );
  await page.getByLabel("Purchase price", { exact: true }).fill("");
  await expect(
    page.getByLabel("Purchase price", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("button", { name: "Save scenario", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Purchase price", { exact: true }).fill("325000");
  await expect(
    page.getByRole("button", { name: "Save scenario", exact: true }),
  ).toBeEnabled();
});

test("distinguishes short-term modelling and renders every analysis view", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("button", { name: "Short-term Nightly stays" }).click();
  await expect(page.getByLabel("Nightly rate", { exact: true })).toBeVisible();
  await page.getByLabel("Occupancy", { exact: true }).fill("0");
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    /-\$/,
  );
  await page.getByLabel("Occupancy", { exact: true }).fill("65");
  for (const name of [
    "Projections",
    "Mortgage",
    "Risk & sensitivity",
    "Overview",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    if (name === "Projections") {
      await expect(page.getByRole("table")).toBeVisible();
      await page.getByRole("button", { name: "ROI", exact: true }).click();
    }
    if (name === "Mortgage") {
      await expect(
        page.getByRole("heading", { name: "Amortization schedule" }),
      ).toBeVisible();
    }
    if (name === "Risk & sensitivity") {
      await expect(
        page.getByRole("heading", { name: "Year 1, three ways" }),
      ).toBeVisible();
      await page.getByRole("slider").first().fill("20");
    }
  }
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("saves, compares, reloads and persists a scenario", async ({ page }) => {
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Scenario name").fill("Charlotte baseline");
  await dialog
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("Property name", { exact: true }).fill("Changed draft");
  await page.getByRole("button", { name: /Saved scenarios/ }).click();
  await expect(
    dialog.getByText("Charlotte baseline", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByLabel("Property name", { exact: true })).toHaveValue(
    "Charlotte baseline",
  );
  await page.reload();
  await expect(page.getByLabel("Property name", { exact: true })).toHaveValue(
    "Charlotte baseline",
  );
});

test("exports a backup and a projection CSV, rejects invalid imports, exposes methodology", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Property file/ }).click();
  expect((await jsonDownload).suggestedFilename()).toBe("stead-property.json");
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Year-by-year projections/ }).click();
  expect((await csvDownload).suggestedFilename()).toBe("stead-projections.csv");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /Saved scenarios/ }).click();
  await page
    .getByLabel("Import property JSON")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1,"assumptions":{}}'),
    });
  await expect(page.getByRole("status")).toContainText("Missing or invalid");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Methodology", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("How the numbers work", { exact: true }),
  ).toBeVisible();
  expect(
    await page.getByRole("dialog").getByRole("link").count(),
  ).toBeGreaterThanOrEqual(7);
});
