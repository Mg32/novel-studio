import test from "node:test";
import assert from "node:assert/strict";
import {
  parseScript,
  serializeScript,
} from "../src/lib/script.js";

test("parse supported tags and text", () => {
  const script = `*start
[bg storage=https://example.com/bg.png]
hello
[p]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.ast.length, 4);
  assert.equal(parsed.ast[0].tag, "label");
  assert.equal(parsed.ast[2].type, "text");
});

test("parse reports errors with line numbers", () => {
  const script = `*start
[unknown foo=1]
[bg]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 2);
  assert.deepEqual(
    parsed.diagnostics.map((item) => item.line),
    [2, 3],
  );
});

test("serialize roundtrip keeps command meaning", () => {
  const input = `*start
[chara_new name=hero storage=https://example.com/ch.png]
hello
[r]
world
[p]`;
  const first = parseScript(input);
  const serialized = serializeScript(first.ast);
  const second = parseScript(serialized);
  assert.equal(second.diagnostics.length, 0);
  assert.equal(second.ast.length, first.ast.length);
  assert.equal(second.ast[0].attrs.name, "start");
  assert.equal(second.ast[2].text, "hello");
});

test("parse supports link tag with endlink", () => {
  const script = `[label name=start]
[link target=*route_a]A[endlink]
[link target=*route_b]B[endlink]
[s]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.ast[1].tag, "link");
  assert.equal(parsed.ast[1].text, "A");
  assert.equal(parsed.ast[1].attrs.target, "*route_a");
});
