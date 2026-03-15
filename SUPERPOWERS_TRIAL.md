# Superpowers Trial (single-repo sandbox)

This repository is the dedicated trial space for the Superpowers workflow.

## Intent
Build a **global, god-tier wayfinding consultancy directory** focused on luxury and landmark developments.

## Definition of "god-tier"
Include firms that demonstrate one or more of:
- Major luxury hospitality or flagship retail wayfinding programs
- High-profile airports/rail/cultural/civic wayfinding systems
- Strategy-led wayfinding + environmental graphics capability (not just fabrication)
- Strong portfolio evidence with globally recognized clients/projects

## Working loop
1. Brainstorm next geography and acceptance criteria
2. Write plan in small testable tasks
3. Execute via subagents
4. Review each batch for evidence quality + duplicates
5. Commit/push by region/country

## Suggested prompt for coding agents
"Use Superpowers workflow. First clarify scope and success criteria for adding god-tier wayfinding consultancies for <region>. Then present design/plan in small chunks for approval. After approval, execute with subagent-driven implementation and quality review before each commit."

## Guardrails
- No weak matches
- No generic print-only shops
- Dedupe by normalized domain + company name
- Preserve schema consistency
