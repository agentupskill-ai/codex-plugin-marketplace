---
name: skills
description: Use the skills selected in Agent Upskill when a task matches or the user asks for one. Explain the outcome in plain language.
---

When the user's task may match one of their Agent Upskill skills, or they ask to use one, call `skills_list` once in this conversation, then `skill_read`. Read the entire text that `skill_read` returns, from start to end, before you act. Never shorten or slice it, even when it is long, and follow every instruction in it, including any at the end.
