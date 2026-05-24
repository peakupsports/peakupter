import { chromium } from 'playwright';

const browser = await chromium.launch();
const viewports = [390, 768, 1024, 1280];
const failures = [];

for (const w of viewports) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('http://localhost:3000/ambassador-program', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const windowWidth = window.innerWidth;
    const htmlScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const hasOverflow = htmlScrollWidth > windowWidth;

    const offenders = hasOverflow
      ? [...document.querySelectorAll('*')]
          .map(el => ({
            className: (el.className || '').toString().slice(0, 100),
            tag: el.tagName,
            overflowPx: Math.round(el.getBoundingClientRect().right - windowWidth),
          }))
          .filter(x => x.overflowPx > 0)
          .sort((a, b) => b.overflowPx - a.overflowPx)
          .slice(0, 5)
      : [];

    return { windowWidth, htmlScrollWidth, bodyScrollWidth, hasOverflow, offenders };
  });

  console.log(`width=${w}:`, result);
  if (result.hasOverflow) failures.push({ w, ...result });
  await page.close();
}

console.log(failures.length ? `\nFAILURES: ${failures.length}` : '\nAll viewports pass acceptance test');
await browser.close();
process.exit(failures.length ? 1 : 0);
