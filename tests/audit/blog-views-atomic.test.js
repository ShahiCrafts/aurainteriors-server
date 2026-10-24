// B-28 (model half) - kept in its own file because the controller
// tests stub the Blog model, while this test needs the real schema.
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("B-28: incrementViews uses an atomic update, not save()", async () => {
  const Blog = require("../../models/blog.model");
  let captured;
  const fakeDoc = {
    views: 7,
    updateOne: async (update) => { captured = update; return { modifiedCount: 1 }; },
    save: async () => { throw new Error("save() must not be used by incrementViews"); },
  };
  await Blog.schema.methods.incrementViews.call(fakeDoc);
  assert.deepEqual(captured, { $inc: { views: 1 } });
});

