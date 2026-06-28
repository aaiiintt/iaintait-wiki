# Behavioral Constraints & Guardrails

## 1. Deployment Guardrails (CRITICAL & NON-NEGOTIABLE)
- NEVER run the local docker deployment script `./deploy-local.sh`, docker push, or any Google Cloud Run (`gcloud run deploy`) deployment commands automatically.
- Any remote deploy action MUST be explicitly requested by the user in the active turn.
- If a task involves deployment, STOP before executing the command and request explicit user confirmation first.

## 2. Planning & Code Changes
- For any complex task, architectural change, or feature expansion, you must present a structured plan in `implementation_plan.md` first.
- Wait for explicit user approval of the plan before writing code or executing modifying commands.

## 3. Development Loop
- Always run typechecks (`npm run check`) after every edit.
- Always run unit tests (`npm run test`) after logic changes.
- If a test or typecheck fails, fix it before moving on. Never stack changes on a red build.
