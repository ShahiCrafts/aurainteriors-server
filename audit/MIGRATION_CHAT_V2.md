# Chat Pipeline v2 migration

- Branch: `feat/chat-pipeline-v2` (backend repository).
- Default remains v1. Set `CHAT_PIPELINE=v2` only after blocked integration gates are completed.
- v2 accepts customer messages with HTTP 202 after persistence, serializes turns per chat, and persists one senderless bot message.
- Rollback: set `CHAT_PIPELINE=v1` and restart the backend/worker process.
- No database migration is required by this patch. Real `.env` files were not edited; safe placeholders are in `.env.example`.
- Run `backend/scripts/run-chat-gate.sh` for the currently executable local gate.
- Full provider, Redis, load, E2E and 100-conversation eval gates remain documented as BLOCKED/NEEDS VERIFICATION in the report.
