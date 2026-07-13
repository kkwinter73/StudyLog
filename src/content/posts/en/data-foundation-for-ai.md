---
title: "A Data Foundation for AI — Build the Base Before the Model"
date: 2026-07-13T10:00:00
summary: "Before adopting AI, what you need isn't a clever model but a foundation that keeps usable data flowing to training and inference. Grasp the whole picture as four layers — ingest, store, process, serve — then the lake/DWH/lakehouse choice, the AI-specific additions (feature store and vector DB), and the real heart of it: quality and governance."
tags: ["AI", "データ分析", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: data-foundation-for-ai
---

The first thing "we want to adopt AI" needs isn't a clever model — it's a **foundation where data flows**.
A model only works once data usable for training and inference keeps arriving. This post isn't about a specific product;
it's a one-page grasp of **what a data foundation for AI generally looks like**, as a layered structure.

## Why the "foundation" comes before the "model"

An AI's accuracy is decided less by the algorithm than by the **quality and quantity of the data coming in**.
If that's broken, no high-performance model will produce results. Here's what commonly happens on the ground:

- Data is **scattered everywhere** (production DB, logs, SaaS, spreadsheets) — just collecting it is a chore
- Even collected, it's **inconsistent in format and meaning** and can't be used for training as-is
- The training set you built once is **reproducible by no one** (no record of which data it came from)

> ⭐ Most of the effort in an AI project goes not into "picking a model" but into **getting data into a usable state**.
> A data foundation is the machinery that keeps supplying that usable state, continuously.

## The four layers — ingest, store, process, serve

A data foundation is easiest to grasp as a one-way flow from "raw data → usable form → consumed by AI."
It splits into roughly **four layers**.

```text
[Ingest]     [Store]           [Process]            [Serve]
prod DB ─┐
logs    ─┼─▶ data lake  ─▶ transform & cleanse ─▶ DWH / feature store ─▶ AI / BI / analytics
SaaS    ─┤   (store raw)     (tidy & join)          (shaped for use)
IoT     ─┘
```

| Layer | Role | Typical players |
| --- | --- | --- |
| Ingest | Collect data from everywhere (batch / stream) | integration jobs, CDC, messaging |
| Store | Hold what was collected | data lake / DWH |
| Process | Tidy, join, aggregate | ETL / ELT pipelines |
| Serve | Emit in a form consumers can read | DWH tables, feature store, APIs |

> 💡 Processing has two schools: **ETL** and **ELT**. ETL "transforms then stores"; ELT "stores raw then transforms."
> With cloud and lakes, storing raw first — **ELT** — is today's mainstream. It's flexible and lets you redo the transforms later.

## Three ways to store — data lake / DWH / lakehouse

"Where you store it" sets the character of the foundation. Know the three main approaches.

| Approach | How it stores | Good at | Weakness |
| --- | --- | --- | --- |
| Data lake | Raw data of any kind, as-is (images, logs, JSON too) | cheap and massive; decide the use later | turns into a "swamp" if not organized |
| Data warehouse (DWH) | Structured, tidy tabular form | fast SQL aggregation, BI | poor at raw / unstructured; needs up-front design |
| Lakehouse | Adds a table & transaction layer on top of a lake | best of both (raw and structured in one place) | relatively new; needs operational know-how |

> 🧭 In C#/.NET, you normally load data into **typed classes** (schema-on-write — fix the types when you write).
> A data lake is the reverse: **schema-on-read** — apply types when you *read*. Store raw first, give it meaning at the moment of use.
> The lake mindset is "keep everything for now, decide later."

## AI-specific parts — feature store and vector DB

On top of a general analytics foundation, AI use cases often add two parts.

- **Feature store**: a single place to manage the "features" that feed machine learning.
  It lets you derive the same feature from the **same formula at both training and inference**, preventing the mismatch between them (training-serving skew).
- **Vector DB**: converts text or images into numeric vectors (embeddings), stores them, and
  searches for "semantically nearby" items fast. It's the base for **RAG** (retrieve external knowledge, then hand it to a generative AI).

```text
A RAG example:
question ─▶ turn into embedding ─▶ search vector DB for near docs ─▶ send found docs + question to LLM ─▶ answer
```

> 💡 When making a generative AI (LLM) smarter with your own data, the first move is often **RAG over retraining**.
> Leave the model as-is and just pass "relevant in-house documents" via a vector DB — it gets dramatically more on-point.

## Quality and governance — the real heart

Storing and flowing isn't enough. **Garbage in, garbage out.**
The reliability of the foundation is decided in this layer.

- **Data quality**: detect and reject missing values, duplicates, broken types, outliers. Make "stop broken data before training" a mechanism
- **Lineage**: where did this data come from and how was it transformed? The prerequisite for **reproducible training data**
- **Catalog**: an index of what data lives where. Without it, everything "swamps" and no one can find anything
- **Access control and PII**: who can see what. Make anonymization, masking, and retention limits a rule for **personal data (PII)**

> ⚠️ AI **amplifies the bias and errors** in its training data as-is. Governance isn't "defense" — it's an
> **offensive foundation** that governs the quality of AI output. Don't bolt it on last; weave it into the design from the start.

## Summary

- What AI adoption needs first isn't a model but a **foundation that continuously supplies usable data**. Most of the effort goes here
- The foundation is four layers: **ingest → store → process → serve**. For processing, "store raw then transform" — **ELT** — is today's mainstream
- Storage is a three-way choice: **lake / DWH / lakehouse**. The lakehouse is the compromise that keeps raw and structured in one place
- For AI, add a **feature store** (prevents training-inference mismatch) and a **vector DB** (the base for RAG)
- The real heart is **quality and governance**. Garbage in, garbage out — weave lineage, catalog, and PII into the design from the start

**Related:** [RDBMS Basics](/posts/rdbms-basics/) / [SQL Basics](/posts/sql-basics/) / [Funnel & Drop-off Analysis](/posts/funnel-and-dropoff-analysis/)
