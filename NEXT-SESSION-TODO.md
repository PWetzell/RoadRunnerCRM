# Next Session — Priority Tasks

## 1. Rule-Based Alert System (NEW FEATURE)
Rebuild the Create Alert dialog as a proper rule-based alert system.

### Two alert types:
**Rule-based (automated):**
- Trigger source: Deals, Contacts, Documents, Recruiting
- Conditions: field + operator + value (e.g., stage = negotiation AND amount > 50K, contact idle > 14 days, document expiring)
- Frequency: real-time (on data change), daily check, weekly check
- Action: show in bell notification, mark as priority
- Enable/disable toggle

**Reminder (manual, time-based):**
- Set a date/time
- Optional recurrence: once, daily, weekly, monthly
- Link to a contact, deal, or document
- Message/note

### Files to modify:
- `src/types/alert.ts` — add AlertRule, AlertCondition, AlertFrequency types
- `src/stores/alert-store.ts` — add rule CRUD, evaluation engine
- `src/components/alerts/CreateAlertDialog.tsx` — rebuild as rule builder UI
- `src/hooks/useAlertAutoGen.ts` — integrate with rule engine

## 2. Grid Column Squeeze — Remaining Issue
The recruiting grid still has the auto-fill-width problem when fewer columns exist than viewport width. The `w-full` + `table-layout: fixed` on SharedDataGrid stretches columns to fill. Contacts/Sales work because they have enough columns to overflow. Recruiting/Documents need enough columns to overflow too. Added extra columns but may need more testing.

## 3. Documents Grid — Still on contacts DataGrid import
Make sure documents page is rendering DocumentGrid, not the contacts DataGrid. Was fixed but verify.

## 4. Update SESSION-SUMMARY.md
The summary file is stale — needs updating with all the grid work, tag icons, SharedDataGrid creation, column additions, etc.

## 5. Build as Template
User wants this to be a sellable template beyond portfolio. All features need production quality — no demo shortcuts.
