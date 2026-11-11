/** Title selection and turn handoff using only the public controller and visible UI. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { gameBuildBinding } from './game-build-binding.mjs';

const output = process.env.TWO_PLAYER_OUTPUT || 'evidence/local/two-player-title-current';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable', args: ['--no-sandbox', '--use-angle=swiftshader'] });
const page = await browser.newPage(), errors = [], records = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5463/');
  await page.waitForFunction(() => window.mario?.ready);
  const binding = await gameBuildBinding(page);
  async function save(label, result) {
    const bytes = Buffer.from(result.image.split(',')[1], 'base64');
    const image = `${output}/${label}.png`;
    fs.writeFileSync(image, bytes);
    const status = await page.locator('#status').innerText();
    records.push({ label, frame: result.frame, framesAdvanced: result.framesAdvanced, status, image,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    return records.at(-1);
  }
  async function step(buttons, frames, label, buttons2 = []) {
    const result = await page.evaluate(({buttons, frames, buttons2}) => window.mario.step(buttons, frames, buttons2), {buttons, frames, buttons2});
    return save(label, result);
  }
  await save('power-on-boot', await page.evaluate(() => window.mario.reset({ playing: false })));
  // Native power-on shows grey, black and sky for 32 frames and the title from the 33rd (src/view-rules.ts titleBootColor), so the title baseline is taken then.
  const title = await step([], 33, 'one-player-title');
  const simultaneous = await step(['start','select'], 1, 'simultaneous-title');
  assert.equal(simultaneous.sha256, title.sha256, 'Simultaneous Start+Select leaves the title unchanged');
  await step([], 2, 'simultaneous-title-release');
  const selected = await step(['select'], 1, 'two-player-title');
  assert.notEqual(selected.sha256, title.sha256, 'Select must visibly change the title');
  await step([], 1, 'select-release');
  await step(['start'], 1, 'start-intro');
  const mario = await step([], 169, 'mario-start');
  assert.match(mario.status, /^Mario · 3 lives · World 1-1$/);
  const marioInitial = await page.evaluate(() => window.marioDebug.snapshot());
  await step([], 30, 'mario-controller-two-ignored', ['right','b']);
  const marioAfterOther = await page.evaluate(() => window.marioDebug.snapshot());
  assert.equal(marioAfterOther.player.x, marioInitial.player.x, 'Player 2 bridge must not move Mario');
  await step(['right', 'b'], 200, 'ordinary-death');
  const luigi = await step([], 400, 'luigi-turn');
  assert.match(luigi.status, /^Luigi · 3 lives · World 1-1$/);
  const snapshot = () => page.evaluate(() => window.marioDebug.snapshot());
  const initial = await snapshot();
  await page.evaluate(() => window.mario.resume());
  await page.keyboard.down('ArrowRight');await page.keyboard.down('KeyX');
  await page.waitForFunction(frame => window.marioDebug.snapshot().frame >= frame + 24, initial.frame);
  await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyX');
  const afterPlayerOne = await snapshot();
  assert.equal(afterPlayerOne.player.x, initial.player.x, 'Player 1 keyboard must not move Luigi');
  await page.keyboard.down('KeyL');await page.keyboard.down('KeyO');
  await page.waitForFunction(frame => window.marioDebug.snapshot().frame >= frame + 30, afterPlayerOne.frame);
  await page.keyboard.up('KeyL');await page.keyboard.up('KeyO');
  const afterPlayerTwo = await snapshot();
  assert.ok(afterPlayerTwo.player.x > initial.player.x + 10, 'Player 2 keyboard moves Luigi');
  await page.evaluate(() => window.mario.pause());
  await step([], 1, 'luigi-controller-two-start', ['start']);
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.paused), false, 'Player 2 Start does not pause');
  await step(['start'], 1, 'luigi-paused');
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.paused), true, 'Player 1 Start pauses Luigi');
  await step([], 44, 'luigi-pause-release');await step(['start'], 1, 'luigi-resumed');
  assert.equal(await page.evaluate(() => window.marioDebug.simulation.paused), false);
  const beforeBridge = await snapshot();
  await step([], 20, 'luigi-controller-two-move', ['right','b']);
  assert.ok((await snapshot()).player.x > beforeBridge.player.x, 'Player 2 bridge input moves Luigi');
  assert.deepEqual(errors, []);
  fs.writeFileSync(process.env.TWO_PLAYER_REPORT || 'evidence/two-player-title-current.json', JSON.stringify({
    scope: 'Actual title and ordinary-control death/handoff, separate player keyboards and public controller bridge. Debug snapshots are read only to assert position, pause and frame counts; no state mutations.',
    binding, errors, records,
    controllerObservations: {marioInitial, marioAfterOther, luigiInitial: initial, afterPlayerOne, afterPlayerTwo, beforeBridge},
  }, null, 2) + '\n');
  console.log('Title, ordinary-death handoff, separate player keyboards, player-two bridge, and player-one pause passed.');
} finally { await browser.close(); }
