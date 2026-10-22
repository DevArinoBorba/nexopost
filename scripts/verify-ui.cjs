/* Run against an isolated local QA server. Requires Playwright via PLAYWRIGHT_MODULE or installed locally. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const baseURL = process.env.QA_BASE_URL;
  assert(baseURL && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL), 'Set QA_BASE_URL to the isolated local server.');
  const output = path.resolve(process.env.QA_OUTPUT || 'artifacts/ui');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  let page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
  const routes = ['dashboard', 'upload', 'schedule', 'queue', 'analytics', 'audience', 'accounts', 'ai-shorts', 'autodm', 'settings', 'login', 'register'];
  const report = [];
  try {
    if (!process.env.QA_INTERACTIONS_ONLY) for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const theme of ['light', 'dark']) {
        await context.close();
        context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: theme });
        page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await context.addInitScript(mode => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', mode); }, theme);
        for (const route of routes) {
          const response = await page.goto(`${baseURL}/${route}`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200, route);
          await page.locator('h1').waitFor();
          assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), theme === 'dark', `${route} theme`);
          const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, mainScroll: document.querySelector('main')?.scrollWidth, mainWidth: document.querySelector('main')?.clientWidth }));
          assert(overflow.scroll <= overflow.width + 1, `${route} document overflow at ${width}: ${JSON.stringify(overflow)}`);
          assert(!overflow.mainWidth || overflow.mainScroll <= overflow.mainWidth + 1, `${route} main overflow at ${width}: ${JSON.stringify(overflow)}`);
          await page.screenshot({ path: path.join(output, `${route}-${theme}-${width}.png`), fullPage: true });
          report.push({ route, theme, width, status: 'passed' });
        }
      }
    }
    if (process.env.QA_INTERACTIONS_ONLY) {
      await context.addInitScript(() => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark'); });
    }
    if (report.length) fs.writeFileSync(path.join(output, 'views.json'), JSON.stringify(report, null, 2));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    assert.equal(await page.locator('#app-navigation').evaluate(element => element.inert), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#app-navigation').evaluate(element => element.inert), true);
    await page.getByRole('button', { name: 'Ativar tema claro' }).click();
    assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), false);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), false, 'theme persists');
    await page.goto(`${baseURL}/upload`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Upload em Massa/, exact: false }).click();
    await page.getByRole('button', { name: 'Upload em Massa', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Post Único (Individual)', exact: true }).click();
    await page.goto(`${baseURL}/queue`, { waitUntil: 'networkidle' });
    const timesBefore = await page.locator('input[type=time]').count();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    assert.equal(await page.locator('input[type=time]').count(), timesBefore + 1);
    await page.goto(`${baseURL}/settings`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Aparência', exact: true }).click();
    await page.getByRole('button', { name: 'Sistema', exact: true }).click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    assert.equal(await page.getByRole('button', { name: 'Sistema', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type=email]').fill('invalid@example.test');
    await page.locator('input[type=password]').fill('invalid-login-test');
    await page.getByRole('button', { name: 'Entrar na Conta', exact: true }).click();
    await page.getByText('Credenciais inválidas', { exact: true }).waitFor();
    assert.deepEqual(errors, [], 'No uncaught browser exceptions');
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ routes: report, checks: ['mobile menu', 'theme persistence', 'system preference', 'upload modes', 'queue slot creation (unsaved)', 'invalid login'], errors }, null, 2));
    console.log(JSON.stringify({ views: report.length, interactionChecks: 6, errors, output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
