# Outcome-Based Farmer Navigation and Guided Copilot Shell

## Purpose

FOP16 restructures AgroUnu from technical ledger navigation to outcome-based farmer navigation. The farmer no longer needs to think "where is the Nutrient Balance?" — instead: "I want to buy better", "I need funding", "I want to ask AgroUnu."

## Why Technical Modules Must Be Hidden Behind Outcomes

AgroUnu now has 15+ technical modules. That is good for the Farm Operating Picture but dangerous for UX. Farmers should see:
- Deciziile săptămânii (weekly decisions)
- Finanțare, Cumpără, Vinde, Câmpuri, Documente
- Întreabă AgroUnu (guided questions)

Not: "Product Application Ledger", "Nutrient Balance", "Regional Intelligence."

## Farmer Outcome Map

| Outcome | Primary Route | Farmer Question |
|---------|--------------|-----------------|
| Acasă | /dashboard | Ce trebuie să fac acum? |
| Cumpără mai bine | /invoices | Cum cumpăr mai bine? |
| Vinde mai bine | /cooperative | Cum vând mai bine? |
| Câmpuri | /parcels | Ce se întâmplă pe câmpuri? |
| Întreabă AgroUnu | /ask | Ce pot întreba AgroUnu? |
| Finanțare | /more (future) | Cum obțin finanțare? |
| Documente | /more (future) | Ce documente lipsesc? |
| Încredere | /more (future) | Cine poate vedea datele? |

## Navigation Models

### Desktop Sidebar
Primary (outcome): Acasă, Cumpără, Câmpuri, Cooperativă, Întreabă
Secondary: Stoc, Alerte, Export SAGA, Arendă, Inteligență cooperativă
Utility: Mai mult, Setări

### Mobile Bottom Nav
4 items + "Mai mult": Acasă, Cumpără, Câmpuri, Cooperativă + Mai mult sheet

## /dashboard Changes
- Title: "Deciziile săptămânii"
- Subtitle: contextul fermei + ce nu trebuie făcut automat
- Outcome guidance cards (6 cards)
- Guided copilot entry card → /ask

## /ask — Guided Copilot Shell
- NOT a chatbot
- Safety banner: "Nu ia decizii automat"
- Copilot readiness stats
- Category filter
- 14 question templates across: funding, buying, selling, fields, soil, water, cash-flow, cooperative, scenario, trust
- Answer previews with readiness status
- "How AgroUnu answers" (6 steps)
- "What AgroUnu cannot answer" (10 categories)

## /more — Secondary Navigation
Grouped cards: Achiziții, Câmpuri, Cooperativă, Ghidare, Viitor, Sistem.
Unavailable routes shown as disabled with explanation.

## What Is NOT Implemented
- Chatbot / LLM calls / RAG / vector search
- Autonomous answers or recommendations
- Diagnosis, prescription, eligibility
- Marketplace, contracts, payments
- Free-form question input
- Backend / database changes

## Safe Language Rules

### Never Use (EN)
AI recommendation, automatic decision, ask anything, chatbot decides, best option, optimal action, diagnose, diagnosis confirmed, prescribe, apply fertilizer now, spray now, irrigate now, buy now, sell now, eligibility confirmed, grant approved, contract ready, payment ready, quality certified, financial/legal/tax advice, official answer, guaranteed result.

### Never Use (RO)
recomandare AI, decizie automată, întreabă orice, chatbotul decide, cea mai bună opțiune, acțiune optimă, diagnostic confirmat, prescripție, aplică îngrășământ acum, stropește acum, irigă acum, cumpără acum, vinde acum, eligibilitate confirmată, grant aprobat, contract pregătit, plată pregătită, calitate certificată, consultanță financiară/juridică/fiscală, răspuns oficial, rezultat garantat.

## Relationship to Other Modules
- **Farm Context Pack**: Outcome navigation reads context health
- **Evidence Briefings**: Answer previews link to briefings when available
- **Scenarios**: Scenario questions route to sandbox
- **Knowledge/Playbooks**: Questions route to playbooks
- **Regional Intelligence**: Cooperative questions route to /cooperative-intelligence
- **Trust Controls**: Trust questions route to future /trust

## Future Roadmap
- Real AI copilot after source/citation/guardrail review
- Role-aware guided answers
- Romanian voice/audio support
- Farmer onboarding wizard
- Guided setup for missing farm context
- Offline/mobile question flow
- Adviser-approved answer publishing
