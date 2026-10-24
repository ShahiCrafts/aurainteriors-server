// CodeQL class E (#193, js/incomplete-multi-character-sanitization):
// the RSS excerpt builder stripped tags in ONE regex pass, so split
// payloads reassembled into live tags ("<scr<script>ipt>" -> the
// inner match is removed and "<script>" remains), and entity-encoded
// tags were decoded AFTER stripping, reintroducing them as text that
// becomes markup if rendered as HTML. Excerpts must be plain text
// with no tag structure left.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { extractExcerpt } = require("../../services/rssFeedService");

const TAG_LIKE = /<[a-z][^>]*>/i;

test("CQ-E: split/nested payloads leave no tag structure in excerpts", () => {
  const cases = [
    "<scr<script>ipt>alert(1)</script>",
    "<<script>script>alert(1)<</script>/script>",
    "<img src=x onerror=alert(1)>",
    "&lt;script&gt;alert(1)&lt;/script&gt;",
    "&lt;img src=x onerror=alert(1)&gt;",
    "<div><span>hello</span></div><script>alert(1)</script>",
  ];
  for (const payload of cases) {
    const out = extractExcerpt({ description: payload });
    assert.ok(!TAG_LIKE.test(out), `no tag structure may survive: ${JSON.stringify(payload)} -> ${JSON.stringify(out)}`);
    assert.ok(!out.includes("onerror"), "event-handler attributes must not survive");
  }
});

test("CQ-E: ordinary feed text produces the same excerpt as before (characterization)", () => {
  const out = extractExcerpt({
    description: "<p>Tom &amp; Jerry&#39;s <b>big</b> adventure&nbsp;awaits</p>",
  });
  assert.equal(out, "Tom & Jerry's big adventure awaits");
  const plain = extractExcerpt({ contentSnippet: "Just plain text, no markup at all." });
  assert.equal(plain, "Just plain text, no markup at all.");
});
