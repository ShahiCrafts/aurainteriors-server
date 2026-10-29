// Child-process probe: Review markHelpful regression (Mongoose 9).
//
// markHelpful passes an aggregation PIPELINE array as the update to
// findOneAndUpdate. On Mongoose 9 that call only works with
// `updatePipeline: true` in the options; without it every call errors
// with "Cannot pass an array to query updates unless the
// `updatePipeline` option is set" (documented in
// work/mongoose/mongoose-report.md). This probe drives the REAL
// controller against a real mongodb-memory-server mongod:
//   - a review row is inserted through the raw driver (no hooks),
//   - voter votes -> response must be 200, helpfulCount 1, voted true,
//     and the stored document must carry the vote (updated doc),
//   - the same voter votes again -> toggle off: count 0, voted false.
// Prints RESULT lines; the parent test asserts on them.
const path = require("node:path");

const REPO = path.resolve(__dirname, "../../..");
process.env.JWT_SECRET = ["dummy", "jwt", "for", "tests"].join("-");

// catchAsync handlers return no promise; poll for res/next.
async function waitFor(cond, timeoutMs = 10000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 25));
  }
  return true;
}

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function main() {
  const say = (line) => console.log(`RESULT ${line}`);
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const mongod = await MongoMemoryServer.create();
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(mongod.getUri("aura_mark_helpful_test"));
  try {
    const Review = require(path.join(REPO, "models/review.model"));
    const ctrl = require(path.join(REPO, "controllers/review.controller"));

    const authorId = new mongoose.Types.ObjectId();
    const voterId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const reviewId = new mongoose.Types.ObjectId();
    await Review.collection.insertOne({
      _id: reviewId,
      product: productId,
      user: authorId,
      rating: 5,
      comment: "Solid build quality",
      helpfulVotes: [],
      helpfulCount: 0,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    async function vote(userId) {
      const res = fakeRes();
      let nextErr = null;
      ctrl.markHelpful(
        {
          params: { reviewId: String(reviewId) },
          user: { _id: userId },
          query: {},
        },
        res,
        (e) => {
          nextErr = e || null;
        },
      );
      await waitFor(() => res.body !== null || nextErr !== null);
      return { res, nextErr };
    }

    const first = await vote(voterId);
    say(
      `first status=${first.res.statusCode} error=${first.nextErr ? first.nextErr.message : "none"} count=${first.res.body?.data?.helpfulCount} voted=${first.res.body?.data?.voted}`,
    );
    const stored1 = await Review.collection.findOne({ _id: reviewId });
    say(
      `stored-after-first count=${stored1.helpfulCount} votes=${stored1.helpfulVotes.map(String).join(",")}`,
    );

    const second = await vote(voterId);
    say(
      `second status=${second.res.statusCode} error=${second.nextErr ? second.nextErr.message : "none"} count=${second.res.body?.data?.helpfulCount} voted=${second.res.body?.data?.voted}`,
    );
    const stored2 = await Review.collection.findOne({ _id: reviewId });
    say(
      `stored-after-second count=${stored2.helpfulCount} votes=${stored2.helpfulVotes.length}`,
    );

    // Self-vote is still refused (FA-48 guard unchanged).
    const self = await vote(authorId);
    say(
      `self status=${self.res.statusCode} errorCode=${self.nextErr ? self.nextErr.statusCode : "none"}`,
    );
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
