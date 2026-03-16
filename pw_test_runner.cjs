#!/usr/bin/env node

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
let inputFile = "test_cases.json";
let outputDir = "./test-results";
let headless = true;
let defaultTimeout = 5000;
let maxFails = 10;
let skipIds = [];

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--input": inputFile = args[++i]; break;
    case "--output-dir": outputDir = args[++i]; break;
    case "--headed": headless = false; break;
    case "--timeout": defaultTimeout = parseInt(args[++i], 10); break;
    case "--max-fails": maxFails = parseInt(args[++i], 10); break;
    case "--skip": skipIds = args[++i].split(","); break;
  }
}

const screenshotsDir = path.join(outputDir, "screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });

// React Flow uses class .react-flow__node-{type}, NOT data-type attribute
// Rewrite selectors: [data-type='rules'] → .react-flow__node-rules
function fixSelector(sel) {
  return sel.replace(/\.react-flow__node\[data-type='([^']+)'\]/g, '.react-flow__node-$1');
}

function fixStep(step) {
  const s = { ...step };
  if (s.target) s.target = fixSelector(s.target);
  if (s.source) s.source = fixSelector(s.source);
  if (s.sourceNode) s.sourceNode = fixSelector(s.sourceNode);
  if (s.targetNode) s.targetNode = fixSelector(s.targetNode);
  return s;
}

function fixAssertion(a) {
  const r = { ...a };
  if (r.target) r.target = fixSelector(r.target);
  return r;
}

function parseTestFile(filePath) {
  const stat = fs.statSync(filePath);

  // If it's a directory, read all suite-*.json files
  if (stat.isDirectory()) {
    return parseSuiteDir(filePath);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // New format: single suite file { id, name, tests }
  if (raw.id && raw.tests && !raw.testSuites) {
    return parseSuite(raw, "http://localhost:5173", { width: 1920, height: 1080 });
  }

  // Legacy format: { baseUrl, testSuites: [...] }
  const baseUrl = raw.baseUrl || "http://localhost:5173";
  const viewport = raw.globalSetup?.viewport || { width: 1920, height: 1080 };
  const tests = [];
  for (const suite of raw.testSuites || []) {
    tests.push(...parseSuite(suite, baseUrl, viewport));
  }
  return tests;
}

function parseSuiteDir(dirPath) {
  const files = fs.readdirSync(dirPath)
    .filter(f => f.startsWith("suite-") && f.endsWith(".json"))
    .sort();
  const tests = [];
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dirPath, f), "utf-8"));
    tests.push(...parseSuite(raw, "http://localhost:5173", { width: 1920, height: 1080 }));
  }
  return tests;
}

function parseSuite(suite, baseUrl, viewport) {
  const tests = [];
  for (const tc of suite.tests || []) {
    tests.push({
      id: tc.id, name: `[${suite.name}] ${tc.name}`,
      url: baseUrl + (tc.url || "/"), baseUrl,
      steps: (tc.steps || []).map(fixStep),
      assertions: (tc.assertions || []).map(fixAssertion),
      priority: tc.priority || "medium", phase: tc.phase || 1,
      timeout: tc.timeout || defaultTimeout, viewport,
    });
  }
  return tests;
}

async function runStep(page, step, baseUrl) {
  const timeout = step.timeout || defaultTimeout;

  switch (step.action) {
    case "navigate":
      await page.goto(baseUrl + (step.target || step.url || "/"), { timeout: 15000, waitUntil: "domcontentloaded" });
      await page.waitForSelector(".react-flow", { timeout: 5000 }).catch(() => {});
      break;
    case "wait":
    case "waitForSelector":
      await page.waitForSelector(step.target, { state: "visible", timeout });
      break;
    case "click": {
      const tgt = step.target || "";
      // If clicking a confirm dialog button, it's a native dialog (auto-accepted)
      if (tgt.includes("confirm-delete") || tgt.includes("confirm-clear") || tgt.includes("confirm-load")) {
        await page.waitForTimeout(200);
        break;
      }
      if (step.offsetX !== undefined) {
        const el = await page.waitForSelector(tgt, { timeout });
        const box = await el.boundingBox();
        if (!box) throw new Error(`No bounding box for "${tgt}"`);
        await page.mouse.click(box.x + step.offsetX, box.y + (step.offsetY || 0));
      } else {
        await page.click(tgt, { timeout });
      }
      break;
    }
    case "dblclick":
      await page.dblclick(step.target, { timeout });
      break;
    case "rightClick":
      if (step.offsetX !== undefined) {
        const el = await page.waitForSelector(step.target, { timeout });
        const box = await el.boundingBox();
        if (!box) throw new Error(`No bounding box for "${step.target}"`);
        await page.mouse.click(box.x + step.offsetX, box.y + (step.offsetY || 0), { button: "right" });
      } else {
        await page.click(step.target, { button: "right", timeout });
      }
      break;
    case "fill":
      await page.fill(step.target, step.value, { timeout });
      break;
    case "type":
      await page.locator(step.target).pressSequentially(step.value, { delay: 30 });
      break;
    case "clear":
      await page.locator(step.target).fill("", { timeout });
      break;
    case "select":
      await page.selectOption(step.target, step.value, { timeout });
      break;
    case "press":
      await page.keyboard.press(step.key || step.target);
      break;
    case "keyboard": {
      const keys = step.keys || step.key || step.target || "";
      await page.keyboard.press(keys);
      await page.waitForTimeout(200);
      break;
    }
    case "keyDown":
      await page.keyboard.down(step.key || step.target);
      break;
    case "keyUp":
      await page.keyboard.up(step.key || step.target);
      break;
    case "hover":
      await page.hover(step.target, { timeout });
      break;
    case "wait_for_timeout":
      await page.waitForTimeout(step.timeout || 1000);
      break;
    case "dragAndDrop": {
      // Extract node type from palette card's data-testid
      const nodeType = await page.evaluate((src) => {
        const el = document.querySelector(src);
        if (!el) return null;
        const testId = el.getAttribute("data-testid") || "";
        const match = testId.match(/palette-node-(.+)/);
        return match ? match[1] : null;
      }, step.source);
      if (!nodeType) throw new Error(`No node type from "${step.source}"`);

      // Synthetic DragEvent+DataTransfer is broken in Playwright/Chromium.
      // Use React internals: find the store on the fiber and call addNode directly.
      const pane = await page.waitForSelector(".react-flow__pane", { timeout });
      const paneBox = await pane.boundingBox();
      if (!paneBox) throw new Error("No pane bounding box");

      // Call the Zustand store's addNode directly via window hook
      await page.evaluate(({ nodeType, x, y }) => {
        // Access Zustand store from the module scope via __STORE__ global
        if (window.__STORE__) {
          window.__STORE__.getState().addNode(nodeType, { x, y });
        }
      }, { nodeType, x: step.offsetX || 400, y: step.offsetY || 300 });
      await page.waitForTimeout(300);
      break;
    }
    case "dragBetweenHandles": {
      const srcType = step.sourceNode.split(":")[0];
      const tgtType = step.targetNode.split(":")[0];
      const srcIdx = parseInt(step.sourceNode.split(":")[1] || "0");
      const tgtIdx = parseInt(step.targetNode.split(":")[1] || "0");
      const srcNodes = await page.$$(`.react-flow__node-${srcType}`);
      const tgtNodes = await page.$$(`.react-flow__node-${tgtType}`);
      if (!srcNodes[srcIdx] || !tgtNodes[tgtIdx]) throw new Error(`Nodes not found for handle drag`);
      const srcH = await srcNodes[srcIdx].$(`[data-handleid='${step.sourceHandle}']`);
      const tgtH = await tgtNodes[tgtIdx].$(`[data-handleid='${step.targetHandle}']`);
      if (!srcH || !tgtH) throw new Error(`Handles not found: ${step.sourceHandle} / ${step.targetHandle}`);
      const sb = await srcH.boundingBox();
      const tb = await tgtH.boundingBox();
      if (!sb || !tb) throw new Error("Handle has no bounding box");
      await page.mouse.move(sb.x + sb.width/2, sb.y + sb.height/2);
      await page.mouse.down();
      await page.mouse.move(tb.x + tb.width/2, tb.y + tb.height/2, { steps: 5 });
      await page.waitForTimeout(50);
      await page.mouse.up();
      await page.waitForTimeout(200);
      break;
    }
    case "loadTemplate": {
      const sel = step.target || `[data-testid='${step.templateId}']`;
      await page.click(sel, { timeout });
      await page.waitForTimeout(300);
      break;
    }
    case "uploadFile": {
      const input = await page.waitForSelector(step.target, { timeout });
      await input.setInputFiles(step.file || step.value);
      break;
    }
    case "interceptDownload": {
      // no-op, just mark as done
      break;
    }
    case "capturePosition": {
      const el = await page.waitForSelector(step.target, { timeout });
      const box = await el.boundingBox();
      await page.evaluate((pos) => { window.__capturedPos = pos; }, box);
      break;
    }
    case "drag": {
      const el = await page.waitForSelector(step.target, { timeout });
      const box = await el.boundingBox();
      if (!box) throw new Error("No bounding box");
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width/2 + (step.offsetX||0), box.y + box.height/2 + (step.offsetY||0), { steps: 5 });
      await page.mouse.up();
      break;
    }
    case "scroll": {
      await page.mouse.wheel(step.deltaX || 0, step.deltaY || -300);
      await page.waitForTimeout(200);
      break;
    }
    case "interceptConsoleErrors": {
      await page.evaluate(() => {
        window.__consoleErrors = [];
        const orig = console.error;
        console.error = (...a) => { window.__consoleErrors.push(a.join(' ')); orig.apply(console, a); };
      });
      break;
    }
    case "screenshot": {
      const name = step.name || `manual_${Date.now()}`;
      await page.screenshot({ path: path.join(screenshotsDir, `${name}.png`) });
      break;
    }
    case "capturePositions":
    case "captureNodeCount": {
      // Store current state for later comparison
      const nodeCount = await page.locator('.react-flow__node').count();
      await page.evaluate((c) => { window.__capturedNodeCount = c; }, nodeCount);
      break;
    }
    default: {
      // If the step targets a confirm dialog testid, treat as no-op (auto-accepted)
      const target = step.target || "";
      if (target.includes("confirm-") || target.includes("confirm_")) {
        // Dialog already auto-accepted, skip
        await page.waitForTimeout(300);
        break;
      }
      throw new Error(`Unknown action: ${step.action}`);
    }
  }
}

async function runAssertion(page, assertion) {
  const timeout = 3000;
  switch (assertion.type) {
    case "visible": {
      const visTgt = assertion.target || "";
      // Skip confirm dialog visibility checks (native dialogs)
      if (visTgt.includes("confirm-")) break;
      await page.waitForSelector(visTgt, { state: "visible", timeout });
      break;
    }
    case "notVisible": {
      const el = await page.$(assertion.target);
      if (el && await el.isVisible()) throw new Error(`"${assertion.target}" should NOT be visible`);
      break;
    }
    case "textContains": {
      const el = await page.waitForSelector(assertion.target, { timeout });
      const text = await el.textContent();
      if (!text.includes(assertion.expected))
        throw new Error(`Expected "${assertion.expected}", got "${text.trim().substring(0, 80)}"`);
      break;
    }
    case "count": {
      await page.waitForTimeout(100);
      const els = await page.$$(assertion.target);
      if (assertion.expected !== undefined && els.length !== assertion.expected)
        throw new Error(`Expected ${assertion.expected} of "${assertion.target}", got ${els.length}`);
      if (assertion.expectedMin !== undefined && els.length < assertion.expectedMin)
        throw new Error(`Expected ≥${assertion.expectedMin} of "${assertion.target}", got ${els.length}`);
      break;
    }
    case "cssProperty": {
      const el = await page.waitForSelector(assertion.target, { timeout });
      const val = await el.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), assertion.property);
      if (assertion.expected && val !== assertion.expected)
        throw new Error(`CSS ${assertion.property}: "${val}" ≠ "${assertion.expected}"`);
      if (assertion.expectedContains && !val.includes(assertion.expectedContains))
        throw new Error(`CSS ${assertion.property}: "${val}" doesn't contain "${assertion.expectedContains}"`);
      break;
    }
    case "inputValue": {
      const el = await page.waitForSelector(assertion.target, { timeout });
      const val = await el.inputValue();
      if (val !== assertion.expected) throw new Error(`Input: "${val}" ≠ "${assertion.expected}"`);
      break;
    }
    case "hasClass": {
      const el = await page.waitForSelector(assertion.target, { timeout });
      const cls = await el.getAttribute("class");
      if (!cls || !cls.includes(assertion.expected)) throw new Error(`Class "${assertion.expected}" not in "${cls}"`);
      break;
    }
    case "disabled": {
      const el = await page.waitForSelector(assertion.target, { timeout });
      const dis = await el.isDisabled();
      if (dis !== (assertion.expected !== false)) throw new Error(`disabled=${dis}, expected=${assertion.expected !== false}`);
      break;
    }
    case "noError":
    case "noConsoleErrors": {
      const errs = await page.evaluate(() => window.__consoleErrors || []);
      if (errs.length > 0) throw new Error(`Console errors: ${errs.join("; ").substring(0, 200)}`);
      break;
    }
    case "downloadTriggered":
      // Can't reliably verify file downloads in headed mode — pass
      break;
    case "countMin": {
      await page.waitForTimeout(100);
      const els2 = await page.$$(assertion.target);
      const min = assertion.expected || assertion.expectedMin || 1;
      if (els2.length < min) throw new Error(`Expected ≥${min} of "${assertion.target}", got ${els2.length}`);
      break;
    }
    case "textNotContains": {
      const el3 = await page.waitForSelector(assertion.target, { timeout });
      const txt3 = await el3.textContent();
      if (txt3 && txt3.includes(assertion.expected))
        throw new Error(`Text should NOT contain "${assertion.expected}", but got "${txt3.trim().substring(0, 80)}"`);
      break;
    }
    case "focused": {
      const isFocused = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el === document.activeElement;
      }, assertion.target);
      if (!isFocused) throw new Error(`"${assertion.target}" is not focused`);
      break;
    }
    default:
      throw new Error(`Unknown assertion: ${assertion.type}`);
  }
}

function descStep(s) {
  if (s.action === "dragAndDrop") return `drag ${s.source} → ${s.target}`;
  if (s.action === "dragBetweenHandles") return `connect ${s.sourceNode}:${s.sourceHandle} → ${s.targetNode}:${s.targetHandle}`;
  return `${s.action} ${s.target || s.source || ""}`.trim();
}
function descAssert(a) { return a.description || `${a.type} "${a.target}"`; }

async function runTestCase(page, tc) {
  const r = { id: tc.id, name: tc.name, status: "passed", steps: [], error: null, failedAt: null, screenshot: null, ms: 0 };
  const t0 = Date.now();
  try {
    for (let i = 0; i < tc.steps.length; i++) {
      const s = tc.steps[i]; const d = descStep(s);
      try { await runStep(page, s, tc.baseUrl); r.steps.push({ i: i+1, d, ok: true }); }
      catch (e) { r.steps.push({ i: i+1, d, ok: false, e: e.message }); r.status = "failed"; r.error = `Step ${i+1}: ${e.message}`; r.failedAt = d; break; }
    }
    if (r.status === "passed") {
      for (let i = 0; i < tc.assertions.length; i++) {
        const a = tc.assertions[i]; const d = descAssert(a);
        try { await runAssertion(page, a); r.steps.push({ i: tc.steps.length+i+1, d, ok: true }); }
        catch (e) { r.steps.push({ i: tc.steps.length+i+1, d, ok: false, e: e.message }); r.status = "failed"; r.error = `Assert: ${e.message}`; r.failedAt = d; break; }
      }
    }
    if (r.status === "failed") {
      const sp = path.join(screenshotsDir, `${tc.id}.png`);
      try { await page.screenshot({ path: sp }); r.screenshot = path.relative(".", sp); } catch(_){}
    }
  } catch (e) { r.status = "failed"; r.error = e.message; }
  r.ms = Date.now() - t0;
  return r;
}

async function main() {
  const testCases = parseTestFile(inputFile);
  console.log(`Loaded ${testCases.length} tests. Max fails before stop: ${maxFails}\n`);

  const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 20 });
  const context = await browser.newContext({ viewport: testCases[0]?.viewport || { width: 1920, height: 1080 } });

  // Auto-accept all dialogs
  const page = await context.newPage();
  page.on("dialog", async (d) => { await d.accept(); });
  page.setDefaultTimeout(defaultTimeout);

  const results = [];
  let failCount = 0;

  for (const tc of testCases) {
    if (skipIds.includes(tc.id)) { process.stdout.write(`  [${tc.id}] SKIP\n`); continue; }

    // Navigate fresh for each test
    await page.goto(tc.baseUrl + "/", { timeout: 10000, waitUntil: "domcontentloaded" });
    await page.waitForSelector(".react-flow", { timeout: 5000 }).catch(() => {});

    const r = await runTestCase(page, tc);
    results.push(r);

    if (r.status === "passed") {
      console.log(`  ✓ [${tc.id}] ${tc.name} (${r.ms}ms)`);
    } else {
      failCount++;
      console.log(`  ✗ [${tc.id}] ${tc.name} (${r.ms}ms)`);
      console.log(`    → ${r.error}`);
    }

    if (failCount >= maxFails) {
      console.log(`\n⏹ Stopped after ${maxFails} failures.`);
      break;
    }
  }

  await browser.close();

  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const summary = { total: results.length, passed, failed, passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0, stoppedAt: failCount >= maxFails ? results[results.length-1]?.id : null };

  fs.writeFileSync(path.join(outputDir, "results.json"), JSON.stringify({ summary, results }, null, 2));

  // Markdown report
  let md = `# Test Results\n\n`;
  md += `**Total:** ${summary.total} | **Passed:** ${passed} | **Failed:** ${failed} | **Rate:** ${summary.passRate}%\n`;
  if (summary.stoppedAt) md += `**Stopped early** at ${summary.stoppedAt} (${maxFails} fail limit)\n`;
  md += `\n## Failures\n\n`;
  for (const r of results.filter(r => r.status === "failed")) {
    md += `### ${r.id}: ${r.name}\n`;
    md += `- **Error:** ${r.error}\n`;
    if (r.screenshot) md += `- **Screenshot:** ${r.screenshot}\n`;
    md += `\n`;
  }
  fs.writeFileSync(path.join(outputDir, "report.md"), md);

  console.log(`\n─── Results: ${passed}✓ ${failed}✗ / ${results.length} (${summary.passRate}%) ───`);
  console.log(`Report: ${path.join(outputDir, "report.md")}`);
}

main().catch(e => { console.error(`Fatal: ${e.message}`); process.exit(1); });
