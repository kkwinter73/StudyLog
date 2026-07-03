---
title: "Building the Four Roles of Monitoring Yourself — Prometheus + node-exporter + Grafana"
date: 2026-07-01T23:00:00
summary: "Get a feel for what monitoring actually does — collect, store, query, visualize — by wiring it up by hand just once. All you stand up is Prometheus, node-exporter, and Grafana. This makes it click later what CloudWatch is quietly handling for you."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: build-monitoring-oss
---

Monitoring curriculum (4/9). In parts one and two we nailed down "what and how to measure." This time we get a feel for what monitoring is on the inside — **collect → store → query → visualize** — by wiring it up with our own hands, just once. The goal is to keep CloudWatch from being a black box. **This is minimal. We don't go deep.**

## The four roles of monitoring

Boil down any monitoring stack and it's a combination of these four roles.

| Role | What it does | OSS in charge |
| --- | --- | --- |
| Collect (scrape) | Gathers values from everywhere | node-exporter + Prometheus |
| Store | Keeps them in a time-series DB | Prometheus |
| Query | Asks questions of the stored values | PromQL |
| Visualize | Graphs and dashboards | Grafana |

- **node-exporter**: exposes OS values (CPU/memory/disk) as metrics
- **Prometheus**: [pulls those values in](/en/posts/metric-types-and-collection/), stores them in a time-series DB, and queries them with PromQL
- **Grafana**: queries Prometheus and draws the graphs

## Standing up the three

Start just these three with a minimal `docker-compose.yml`.

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
  node-exporter:
    image: prom/node-exporter
    ports: ["9100:9100"]
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
```

- Prometheus listens on 9090, node-exporter on 9100, and Grafana on 3000

## Configuring collection

Tell Prometheus where to scrape from (the targets). That's the scrape config.

```yaml
# prometheus.yml
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ['node-exporter:9100']
```

- Once **Status → Targets** at `http://localhost:9090` shows `UP`, collection is working
- Pull-based collection also tells you "I can reach it = the target is alive" at the same time

## Query and visualize

Query the accumulated values with PromQL, then draw them in Grafana.

```promql
# CPU (user) usage. It's a counter, so use rate to convert it to "per second"
rate(node_cpu_seconds_total{mode="user"}[1m])
```

- Type this into Prometheus's expression box and line it up against the [CPU you watched by hand](/en/posts/observe-server-by-hand/)
- Add Prometheus (`http://prometheus:9090`) as a Grafana data source and build just one CPU-usage panel

> 💡 Last time's "counters are used with rate" shows up here verbatim. `node_cpu_seconds_total` is a counter, so it only becomes "how much am I using right now" once you wrap it in `rate(...)` instead of reading the raw value.

## What CloudWatch takes over

From the next step on, we'll see how CloudWatch handles the four roles we just built. Here's the mapping:

| OSS (this time) | CloudWatch (from here on) |
| --- | --- |
| node-exporter + scrape | CloudWatch Agent / standard metrics (**push**) |
| Prometheus time-series DB | CloudWatch Metrics |
| PromQL | metric search / metric math |
| Grafana | CloudWatch dashboards |

> ⚠️ The environment we built here is **only for this step**. We won't get into standing up OSS like Alertmanager or Loki. From here on we focus on CloudWatch, always tying each feature back to "which of these four roles is this?"

## Summary

- Boiled down, monitoring is four roles: **collect, store, query, visualize**
- The minimal setup is **node-exporter (expose) + Prometheus (collect, store, query) + Grafana (visualize)**
- Prometheus is **pull-based**. If Targets show `UP`, collection works — and the target is alive
- Counters are read by converting them to "per second" with **rate**
- How CloudWatch takes over these four roles is the through-line from here on. **We don't go deep.**

**Prev:** [Metric types and collection methods](/en/posts/metric-types-and-collection/)　**Next:** [Collecting metrics with CloudWatch](/en/posts/cloudwatch-metrics/) (Step 4)
