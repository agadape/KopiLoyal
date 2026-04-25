# **zer0Gig Git Management Guide**

**Version:** 1.0

**Last Update:** April 12, 2026

**Project:** zer0Gig (DeAI FreelanceAgent)

**Event:** 0G APAC Hackathon 2026 — Hong Kong Mini Demo Day

---

## **1. Purpose**

This guide provides a clear and consistent workflow for branch naming, commit messages, and development process to:

1. **Improve Collaboration:** Standardize structure for all team members.
2. **Enhance Monitoring:** Track changes through well-structured commits.
3. **Simplify Reversions:** Isolate changes to allow for safe rollbacks.
4. **Ensure Reliable Releases:** Maintain quality for the hackathon demo.

---

## **2. Branch Naming Standards**

Use **lowercase** and **hyphens (-)**. Base branch names on tasks or features.

| Prefix | Purpose | Example |
| :---- | :---- | :---- |
| `main` | Production-ready code | `main` |
| `staging` | Staging environment | `staging` |
| `development` | Central ongoing development | `development` |
| `feature/` | New feature development | `feature/subscription-flow` |
| `bugfix/` | General bug fixing | `bugfix/x402-toggle-ux` |
| `hotfix/` | Urgent production fixes | `hotfix/critical-error` |
| `docs/` | Documentation only | `docs/readme-update` |
| `infra/` | Infrastructure/DevOps tasks | `infra/vercel-deploy` |
| `chore/` | Configs, CI/CD, repo setup | `chore/pr-template` |
| `refactor/` | Code restructuring | `refactor/api-logic` |
| `improvement/` | Adjustments to existing features | `improvement/ui-polish` |

---

## **3. Commit Guidelines**

### **3.1 Commit Size Philosophy**

> **"Make every commit understandable for the judges."**

The goal is to make the commit history tell a clear story. Judges (and teammates) should be able to read the commits in order and understand exactly what was built and why.

### **3.2 Commit Size Rules**

| Scenario | Commit Strategy |
| :---- | :---- |
| **Small feature** (1-2 files) | 1 commit is fine |
| **Medium feature** (3-4 files) | Split into 2-3 logical commits |
| **Large feature** (4-5+ files) | Split into 3-4+ logical commits |
| **Emergency fix** | 1 focused commit |

**Key principle:** Always split a large feature into **logical units** that make sense independently. Each commit should have a clear, single purpose that a judge can understand in 10 seconds.

### **3.3 Example: Subscription Proposal System**

```
feat(subscription): reverse send-proposal flow
  - Removed Send Proposal button from AgentCard
  - Simplified create-subscription to pure Hire flow

fix(subscription): await blockchain transaction in approval
  - Added await before createSubscription() call
  - Fixed handleApprove to properly await TX

fix(x402-toggle): move toggle into horizontal bar above summary
  - Improved toggle UX placement
  - Added x402 status inside Summary card
```

### **3.4 Commit Format**

Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
<type>(<scope>): <short summary>
```

| Type | Purpose | Example |
| :---- | :---- | :---- |
| `feat` | New feature | `feat(auth): add wallet connect` |
| `fix` | Bug fix | `fix(subscription): resolve timeout` |
| `refactor` | Code change (no feature/fix) | `refactor(escrow): optimize query` |
| `test` | Adding/updating tests | `test(agent): add unit test` |
| `style` | Formatting/Style (no logic) | `style(nav): fix alignment` |
| `build` | Build system/Dependencies | `build(npm): update react` |
| `minor` | Tiny UI/comment tweaks | `minor: remove log` |
| `chore` | Configs, tooling, repo setup | `chore: add gitignore entry` |

---

## **4. Pre-Commit Integrity Check**

**Before every `git add` and `git commit`, verify:**

1. **Source Integrity:** Changed files are NOT compressed, minified, or condensed
2. **Line-Endings:** No abnormal full-file rewrite from line-ending drift
3. **Scope:** Changes match the intended commit scope
4. **Build:** Run local build to catch errors before pushing

**If detected:** Stop, restore the file, and re-apply only the intended logical change.

---

## **5. Before Pushing**

1. Run **local build** (`npm run build` or equivalent)
2. Verify working tree is clean (`git status`)
3. Branch is synced/rebased to target base
4. All linting passes
5. No console errors in build output

---

## **6. File & Path Reference**

| Component | Path |
| :---- | :---- |
| Frontend | `Project/frontend/` |
| Smart Contracts | `Project/contracts/` |
| Agent Runtime | `Project/agent-runtime/` |
| Supabase DB | `Project/supabase/` |
| Progress Reports | `Progress/Minimax/` |

---

## **7. Hackathon-Specific Notes**

- **Demo Day:** April 14, 2026
- **Deploy on demand** — user will say "deploy" when ready
- **Untracked files:** The `Project/frontend/src/components/jobs/` files are untracked — add them before demo to avoid losing work
- **Environment variables:** Never commit `.env` files; use `.env.example`

---

## **Protocol Summary**

| Priority | Action |
| :---- | :---- |
| **High** | Make commits understandable for judges |
| **High** | Split large features into logical units |
| **High** | Run local build before pushing |
| **Med** | Follow Conventional Commits format |
| **Med** | Check for source integrity before commit |
| **Low** | Update documentation with every feature |
