import test from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../src/lib/script.js";
import { runScenario } from "../src/lib/runner.js";

test("run scenario from label", () => {
  const script = `[label name=start]
line1
[p]
[jump target=second]
[label name=second]
line2
[p]`;
  const { ast, diagnostics } = parseScript(script);
  assert.equal(diagnostics.length, 0);
  const result = runScenario({ ast, startAt: { label: "second" } });
  assert.equal(result.frames.length, 1);
  assert.equal(result.frames[0].message, "line2");
});

test("run scenario from line", () => {
  const script = `[label name=start]
line1
[p]
[label name=middle]
line2
[p]`;
  const { ast } = parseScript(script);
  const lineOfMiddle = 4;
  const result = runScenario({ ast, startAt: { line: lineOfMiddle } });
  assert.equal(result.frames[0].message, "line2");
});

test("run scenario reports unknown start label", () => {
  const script = `[label name=start]
hello
[p]`;
  const { ast } = parseScript(script);
  assert.throws(() => runScenario({ ast, startAt: { label: "missing" } }));
});

