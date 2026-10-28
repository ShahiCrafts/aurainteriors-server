// AR-28 + AR-47 (blog statics): real Blog model, no DB — index
// declarations are read off the schema and the statics' query chains
// are captured by patching Blog.find with a recording fake.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Blog = require("../../models/blog.model");

test("AR-28: text index is scoped to title/excerpt/tags (no $** wildcard)", () => {
  const textIndexes = Blog.schema
    .indexes()
    .filter(
      ([, opts]) => opts && (opts.text || opts.name === "blog_search_text"),
    )
    .concat(
      Blog.schema
        .indexes()
        .filter(([keys]) => Object.values(keys).includes("text")),
    );
  assert.ok(textIndexes.length >= 1, "a text index must be declared");
  for (const [keys] of textIndexes) {
    assert.deepEqual(
      Object.keys(keys).sort(),
      ["excerpt", "tags", "title"],
      `text index must be scoped, got ${JSON.stringify(keys)} (wildcard $** = fail-before)`,
    );
  }
});

test("AR-47 + PERF-B-08: both statics are lean; getPopular excludes content, getFeatured unchanged", async () => {
  const original = Blog.find;
  const records = [];
  Blog.find = () => {
    const rec = {};
    records.push(rec);
    const q = {
      sort() {
        return q;
      },
      limit() {
        return q;
      },
      select(s) {
        rec.select = s;
        return q;
      },
      lean() {
        rec.lean = true;
        return q;
      },
      then(onF) {
        // Simulate the -content projection the way MongoDB would.
        const doc =
          rec.select === "-content"
            ? { title: "t" }
            : { title: "t", content: "BODY" };
        return Promise.resolve([doc]).then(onF);
      },
    };
    return q;
  };
  try {
    const popular = await Blog.getPopular(5);
    const featured = await Blog.getFeatured(3);
    assert.equal(
      popular[0].content,
      undefined,
      "PERF-B-08: popular no longer ships the article body",
    );
    assert.equal(
      records[0].select,
      "-content",
      "getPopular must select -content",
    );
    assert.equal(featured[0].content, "BODY", "getFeatured shape is unchanged");
    assert.ok(
      records.every((r) => r.lean),
      "both statics must be lean",
    );
  } finally {
    Blog.find = original;
  }
});
