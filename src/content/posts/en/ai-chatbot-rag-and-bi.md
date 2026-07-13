---
title: "An AI Chatbot Over Your Own Data — RAG (Documents) and BI (Numbers)"
date: 2026-07-13T11:00:00
summary: "To build an AI that answers questions about your company's information, there are two patterns split by the type of data: RAG for unstructured documents, and BI integration (Text-to-SQL) for the numbers in your warehouse. Here's each one's flow, when to use which, how to combine them (routing), and the gotchas — hallucination, access control, and SQL safety."
tags: ["AI", "データ分析"]
level: intermediate
lang: en
translationKey: ai-chatbot-rag-and-bi
---

You want "an AI chatbot that answers when you ask about company information" — internally, it splits into
**two patterns** by the type of data. **RAG**, which answers from documents, and **BI integration (Text-to-SQL)**, which answers from numbers and tables.
Both share the same core: **search first, then answer**. This post isn't about a specific product; it's a one-page grasp of the two flows and when to use which.

## Premise — a chatbot "searches, then answers"

An LLM is smart, but it **doesn't know your latest data**. So you "find the relevant data first, then hand it over to answer."
Answering based on the facts you retrieved is called **grounding**.
RAG and BI integration differ only in "the type of data being searched."

| Pattern | Answers about | Data shape | Example question |
| --- | --- | --- | --- |
| RAG | docs, manuals, policies, FAQs | unstructured (text) | "What's the expense-report cutoff date?" |
| BI (Text-to-SQL) | revenue, counts, KPIs | structured (DWH tables) | "Last month's revenue by region" |

> ⭐ For both, the crux is less "the LLM's smarts" than **search accuracy**. Hand it something off-target and the LLM will plausibly get it wrong.
> It assumes the data is tidy at the foundation level ([A Data Foundation for AI](/posts/data-foundation-for-ai/)).

## Pattern 1: RAG — answering from documents (unstructured data)

**RAG (Retrieval-Augmented Generation)** searches documents, hands the found excerpts to the LLM, and
has it answer based on them. It's strong on "knowledge written as prose" — manuals, policies, and the like.

```text
[Prep]  split docs (chunks) ─▶ turn into embeddings ─▶ store in vector DB
[Query] embed the question ─▶ search vector DB for near excerpts ─▶ excerpts + question to LLM ─▶ answer with citations
```

- Split documents into **chunks** (a few hundred chars), turn them into **embeddings** (vectors), and store in a **vector DB**
- Embed the question too, pull the **top-k semantically nearest excerpts**, and add them to the prompt
- Always attach **citations** (which doc, where) to the answer. The user can verify it and catch errors

> 💡 No need to retrain the model. RAG's advantage: **you refresh knowledge just by updating the vector DB side**.
> Swap the documents and it answers with the new content from the next question on.

## Pattern 2: BI / Text-to-SQL — answering with numbers (structured data)

An **aggregate** like "what was last month's revenue?" isn't in any document. You have to **run SQL** against the DWH tables to count it.
So you have the LLM write **natural language → SQL**: that's **Text-to-SQL**, the core of a BI-integrated chatbot.

```text
"Last month's revenue by region" ─▶ LLM generates SQL ─▶ run on DWH ─▶ answer as table/chart + prose
```

- Give the LLM the **table definitions (schema)** and have it generate SQL matching the question
- The key to accuracy is a **semantic layer** (a layer that fixes definitions of metrics like "revenue" or "active users" up front).
  It absorbs terminology drift so the LLM picks the right columns and aggregations
- Returning results as **tables and charts** makes it feel like real BI

> 🧭 C#/.NET's EF Core translates LINQ expressions into SQL **safely**. Text-to-SQL is the same, but with an LLM as the translator —
> and **its output isn't guaranteed**. So you must interpose "read-only role, SQL validation, row/cost limits" on the human side.
> Don't fully trust the translation (the same wariness as [SQL injection](/posts/sql-injection/)).

## Which to use — and combining them (routing)

Fit depends on the nature of the question. In most real setups you **keep both and route per question**.

| Aspect | RAG | BI (Text-to-SQL) |
| --- | --- | --- |
| Good questions | "What's the policy?" "What's the procedure?" | "How many?" "How much?" "What's the trend?" |
| Source data | documents, text | DWH tables, numbers |
| Weakness | poor at aggregation and latest numbers | weak on prose meaning and definition drift |
| Updates | just swap the documents | needs schema/metric-definition upkeep |

> 💡 In practice, put a **router** at the entrance: send "questions asking for numbers" to Text-to-SQL and
> "questions asking for knowledge" to RAG. One bot uses both patterns internally.

## Gotchas

Because it *looks* like it works, the pitfalls bite in operation.

- **Hallucination**: with no basis, an LLM will calmly make things up. Make **citations mandatory** and instruct it to "say you don't know when you don't"
- **Access control (data leaks)**: the bot must not answer with **rows the user isn't allowed to see**. Apply **access control** at the search/SQL stage
- **Ambiguous questions**: in "recent revenue," when is "recent"? **Ask back for the period and units**, or state the default explicitly
- **SQL safety and cost**: run generated SQL **read-only**, and stop runaway or expensive queries with `LIMIT` and timeouts

> ⚠️ "The demo works but nobody trusts it in production" almost always traces to these four. Before chasing accuracy,
> guaranteeing **citations, access control, clarification, and safety valves** by design is the shortcut to a trusted bot.

## Summary

- A bot over your own data "**searches, then answers**." The crux is search accuracy, not the LLM's smarts
- **RAG** answers from documents (unstructured): chunk → embed → vector-DB search → cited answer. **Refresh knowledge by updating the DB alone**
- **BI (Text-to-SQL)** answers with numbers (structured): NL → SQL → run on DWH. A **semantic layer** raises accuracy
- Real setups **keep both and route**: number questions to SQL, knowledge questions to RAG — a hybrid is standard
- Whether it's trusted in production rests on four points: **citations, access control, clarification, SQL safety valves**. Guarantee them by design before chasing accuracy

**Related:** [A Data Foundation for AI](/posts/data-foundation-for-ai/) / [SQL Basics](/posts/sql-basics/) / [SQL Injection](/posts/sql-injection/)
