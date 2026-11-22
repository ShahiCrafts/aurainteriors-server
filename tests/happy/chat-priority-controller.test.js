// Batch 3c — chat.controller.updatePriority + updatePrioritySchema.
//
// The controller is a thin catchAsync wrapper over
// ChatService.updatePriority (stubbed here, see
// tests/audit/helpers.js); the Joi schema is the request-body gate on
// PATCH /chats/:id/priority (admin-only route, routes/chat.routes.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");

const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f02";
const ADMIN_ID = "64b64c2f4f5a6b7c8d9e0f01";

const serviceCalls = [];
stubModule("services/chatService.js", {
  updatePriority: async (chatId, priority, userId) => {
    serviceCalls.push({ chatId, priority, userId });
    return { _id: chatId, priority };
  },
});

const chatController = require("../../controllers/chat.controller");
const { updatePrioritySchema } = require("../../validators/chat.validator");

test.beforeEach(() => {
  serviceCalls.length = 0;
});

test("controller passes id, body priority and admin id to the service and returns 200", async () => {
  const res = mockRes();
  const next = mockNext();

  chatController.updatePriority(
    { params: { id: CHAT_ID }, body: { priority: "urgent" }, user: { _id: ADMIN_ID } },
    res,
    next,
  );

  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.chat.priority, "urgent");
  assert.deepEqual(serviceCalls, [
    { chatId: CHAT_ID, priority: "urgent", userId: ADMIN_ID },
  ]);
});

test("updatePrioritySchema accepts every enum priority", () => {
  for (const priority of ["low", "normal", "high", "urgent"]) {
    const { error, value } = updatePrioritySchema.validate({ priority });
    assert.equal(error, undefined);
    assert.equal(value.priority, priority);
  }
});

test("updatePrioritySchema rejects non-enum and missing priorities", () => {
  for (const body of [{ priority: "medium" }, { priority: "" }, {}, { priority: 3 }]) {
    const { error } = updatePrioritySchema.validate(body);
    assert.ok(error, `expected validation error for ${JSON.stringify(body)}`);
  }
});
