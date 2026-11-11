import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/tmp/mario-playwright/chromium-1148/chrome-linux/chrome',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-webgl'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
  await page.waitForFunction(() => window.mario?.ready);
  const start = page.locator('#start');
  const pause = page.locator('#pause');
  await page.evaluate(() => window.mario.reset({playing: false}));
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.phase), 'title');
  await start.click();
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.phase), 'intro', 'Start begins from the title');
  await page.evaluate(() => window.mario.step([], 220));
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.phase), 'play');
  await pause.click();
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.paused), true, 'Pause button pauses play');
  assert.equal((await page.evaluate(() => window.mario.step(['right'], 44))).framesAdvanced, 0, 'paused game does not advance');
  await pause.click();
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.paused), false, 'Pause button resumes play');
  assert.equal((await page.evaluate(() => window.mario.step(['right'], 30))).framesAdvanced, 30, 'resumed game advances');
  await page.evaluate(() => window.mario.step([], 45));

  // The bridge pauses the animation loop, so apply the key through normal play.
  await page.evaluate(() => window.mario.resume());
  await page.keyboard.down('Enter');
  await page.waitForFunction(() => window.marioDebug.simulation.paused);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(1000);
  await page.keyboard.down('Enter');
  await page.waitForFunction(() => !window.marioDebug.simulation.paused);
  await page.keyboard.up('Enter');
  assert.deepEqual(errors, []);
  console.log('Start button and Enter pause/resume ordinary play successfully.');
} finally {
  await browser.close();
}
