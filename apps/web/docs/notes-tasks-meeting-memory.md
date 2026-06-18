# MEMORY1: Notes, Tasks and Meeting Memory

## Concept

AgroUnu helps the farmer remember what was discussed, decided, deferred, and left uncertain. The Memory System captures structured meeting notes, tasks, open questions, and decision records — all visible and controlled by the farmer.

## Architecture

1. **Deterministic Extraction** — Tasks, questions, and decisions are created from structured form fields and template sections, never from free-text AI parsing.
2. **Farmer Control** — Every memory record is visible to the farmer. Nothing is secretly stored.
3. **Demo/Local Only** — This version uses in-memory state with seeded demo data. No backend persistence, no production consent storage.
4. **Safety Flags** — Records that touch diagnosis, prescription, eligibility, contracts, payments, or legal/fiscal matters are flagged and require human review.

## Data Model

- **MemoryRecord**: Notes from meetings with agronomists, accountants, funding advisers, coordinators, suppliers, or internal reviews.
- **MemoryTask**: Draft tasks assigned to roles (farmer, agronomist, accountant, etc.) with priority, safe next steps, and "what not to assume."
- **MemoryOpenQuestion**: Questions that need specialist answers.
- **MemoryDecisionRecord**: Records of farmer decisions — accepted, rejected, deferred, or blocked as high-risk.
- **MemoryTimeline**: Chronological view of all memory events.

## Templates

- Întâlnire cu agronomul
- Întâlnire cu contabilul
- Întâlnire consultant finanțare
- Întâlnire coordonator pool
- Vizită în câmp
- Revizuire săptămânală
- Notă Workspace
- Notă generală

## What Is NOT Implemented

- Voice recording or speech-to-text
- LLM-assisted summarization
- Production persistence or audit logs
- GDPR compliance claims
- Official consent storage
- Legal minutes or binding records
- Calendar integration
- Email/SMS notifications

## Future Roadmap

- Voice note capture (after consent review)
- Speech-to-text (after safety review)
- LLM-assisted meeting summarization
- Production audit logs
- Role-based sharing with permissions
- Task reminders and calendar sync
