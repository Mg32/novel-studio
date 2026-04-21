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
  assert.equal(parsed.ast.length, 3);
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

test("parse rejects non-tyranoscript label tag syntax", () => {
  const script = `[label name=start]
hello[p]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 1);
  assert.equal(parsed.diagnostics[0].line, 1);
  assert.match(parsed.diagnostics[0].message, /Unsupported tag: label/);
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
  assert.equal(second.ast[0].attrs.name, "*start");
  const roundtripText = second.ast.find((node) => node.type === "text");
  assert.ok(roundtripText);
  assert.match(roundtripText.text, /hello/);
  assert.match(roundtripText.text, /world/);
});

test("parse supports link tag with endlink", () => {
  const script = `*start
[link target=*route_a]A[endlink]
[link target=*route_b]B[endlink]
[s]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.ast[1].tag, "link");
  assert.equal(parsed.ast[1].text, "A");
  assert.equal(parsed.ast[1].attrs.target, "*route_a");
});

test("parse supports @jump syntax", () => {
  const script = `*start
@jump target=*next
*next
ok[p]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.ast[1].tag, "jump");
  assert.equal(parsed.ast[1].attrs.target, "*next");
});

test("parse supports block link syntax", () => {
  const script = `*start
[link target=*route_a]
選択肢A
[endlink]
[s]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.ast[1].tag, "link");
  assert.equal(parsed.ast[1].attrs.target, "*route_a");
  assert.equal(parsed.ast[1].text, "選択肢A");
});

test("parse reports missing endlink", () => {
  const script = `*start
[link target=*route_a]
選択肢A
[s]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 1);
  assert.match(parsed.diagnostics[0].message, /Missing \[endlink\]/);
});

test("parse reports unexpected endlink", () => {
  const script = `*start
[endlink]
[p]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 1);
  assert.match(parsed.diagnostics[0].message, /Unexpected \[endlink\]/);
});

test("serialize does not append [p] when text ends with [l]", () => {
  const script = `*start
line[l]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  const serialized = serializeScript(parsed.ast);
  assert.match(serialized, /line\[l\]/);
  assert.doesNotMatch(serialized, /line\[l\]\[p\]/);
});

test("parse supports empty speaker marker '#'", () => {
  const script = `*start
#
line[p]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.ast[1].type, "speaker");
  assert.equal(parsed.ast[1].name, "");
});

test("parse splits inline [l] and keeps next line break behavior", () => {
  const script = `*start
A[l]B[p]
C[l]
D[p]`;
  const parsed = parseScript(script);
  assert.equal(parsed.diagnostics.length, 0);
  const textNodes = parsed.ast.filter((node) => node.type === "text");
  assert.equal(textNodes.length, 4);
  assert.equal(textNodes[0].text, "A[l]");
  assert.equal(textNodes[1].text, "B[p]");
  assert.equal(textNodes[2].text, "C[l]");
  assert.equal(textNodes[3].text, "D[p]");
});
