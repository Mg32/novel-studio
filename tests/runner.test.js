import test from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../src/lib/script.js";
import { runScenario } from "../src/lib/runner.js";

test("run scenario from label", () => {
  const script = `*start
line1
[p]
[jump target=*second]
*second
line2
[p]`;
  const { ast, diagnostics } = parseScript(script);
  assert.equal(diagnostics.length, 0);
  const result = runScenario({ ast, startAt: { label: "*second" } });
  assert.equal(result.frames.length, 1);
  assert.equal(result.frames[0].message, "line2");
});

test("run scenario from line", () => {
  const script = `*start
line1
[p]
*middle
line2
[p]`;
  const { ast } = parseScript(script);
  const lineOfMiddle = 4;
  const result = runScenario({ ast, startAt: { line: lineOfMiddle } });
  assert.equal(result.frames[0].message, "line2");
});

test("run scenario reports unknown start label", () => {
  const script = `*start
hello
[p]`;
  const { ast } = parseScript(script);
  assert.throws(() => runScenario({ ast, startAt: { label: "missing" } }));
});

test("run scenario halts on choice and continues on selected target", () => {
  const script = `[label name=start]
before[p]
[link target=*route_a]go a[endlink]
[link target=*route_b]go b[endlink]
[s]
*route_a
A[p]
*route_b
B[p]`;
  const { ast, diagnostics } = parseScript(script);
  assert.equal(diagnostics.length, 0);

  const first = runScenario({ ast });
  const choiceFrame = first.frames[first.frames.length - 1];
  assert.ok(Array.isArray(choiceFrame.choices));
  assert.equal(choiceFrame.choices.length, 2);

  const next = runScenario({
    ast,
    startAt: { label: "*route_b" },
    initialState: choiceFrame.choiceRuntime.state,
    initialLabel: choiceFrame.choiceRuntime.label,
  });
  assert.equal(next.frames[0].message, "B");
});
