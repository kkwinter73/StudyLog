---
title: "Intro to Infra for Go Apps — from a Single Binary to Container Deploys"
date: 2026-06-19T21:00:00
summary: "Go's biggest strength is compiling to a single, runtime-free binary. From the traits of the build artifact to multi-stage Docker, passing config, deploy targets, and the bare minimum of operations — here's the big picture."
tags: ["インフラ", "デプロイ", "Go"]
level: intermediate
lang: en
translationKey: deploying-go-apps
---

"How you run and ship what you wrote" is what infra is about. Go makes this area remarkably easy.
The reason is simple —— **it compiles to a single, runtime-free binary**. Let's build the whole picture around that.

## Why Go plays so well with infra

When you build Go, you get **one executable** that bundles all its dependencies. You don't need to
install Go on the server, and you don't need to line up matching runtimes. Just drop the binary and run it.

- Shipping is a single `scp`
- The "it won't run because of version mismatch" problem rarely happens
- You can make container images extremely small

> 🧭 With .NET you need either a self-contained publish (runtime bundled in) or a runtime installed on the server.
> With Go, that's the default behavior — that's the intuitive difference.

## Build artifact: static binaries and cross-compilation

`go build` produces an executable. On top of that, you can **build for another OS/CPU using nothing but
environment variables** (cross-compilation). This is quietly powerful.

```bash
# For your local OS
go build -o app .

# Build for Linux/arm64 from a different OS (disable CGO for a fully static build)
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o app .
```

- Set the target with `GOOS` / `GOARCH` (`linux`/`darwin`/`windows`, `amd64`/`arm64`, etc.)
- Disabling C dependencies with `CGO_ENABLED=0` gives you a **fully static binary** that doesn't even depend on libc

> 💡 A static binary "runs even without the OS's libraries." This pays off with the `scratch` image below.

## Containerizing: keep it small with multi-stage builds

To make the most of Go's strengths, use a **multi-stage build**. Build in a heavy build image, then
copy only the artifact into an empty image.

```dockerfile
# --- build stage ---
FROM golang:1.26 AS build
WORKDIR /src
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app .

# --- run stage (artifact only) ---
FROM gcr.io/distroless/static-debian12
COPY --from=build /app /app
ENTRYPOINT ["/app"]
```

- Neither the compiler nor the source ends up in the final image → it fits in **a few to a dozen-odd MB**
- For the run-only image, `scratch` (completely empty) or `distroless/static` (includes certs and tz) are the go-to choices
- Small = faster pulls and a smaller attack surface

## Pass config through environment variables

Keep the image single, and **inject per-environment differences (DB endpoint, port, API keys) from the outside
via environment variables**. This is the so-called 12-factor approach.

```go
port := os.Getenv("PORT")
if port == "" {
	port = "8080" // provide a default
}
http.ListenAndServe(":"+port, mux)
```

> ⚠️ Don't bake secrets (API keys, etc.) into the image or into Git. Pass them via environment variables
> or a cloud secrets mechanism (Secrets Manager, etc.).

## Where to run it (a rough comparison)

| Option | Examples | Best for |
| --- | --- | --- |
| PaaS / serverless containers | Cloud Run, Render, Fly.io | Small-to-mid scale, wanting ops handled for you |
| Container orchestration | Kubernetes (GKE/EKS) | Large scale, needing fine-grained control |
| VM / bare metal | EC2 + systemd | Simple setups, cost-focused |

> 💡 Since it's a single binary, "drop it on a VM and keep it running with `systemd`" is perfectly realistic.
> While you're small, you often don't need fancy infrastructure — a container plus a managed service is enough.

## The bare minimum of operations: health checks and graceful shutdown

If you're putting it in production, you'll want these two.

- **Health check**: a liveness endpoint like `/healthz` (the platform uses it for monitoring and restarts)
- **Graceful shutdown**: when it receives a stop signal, finish in-flight requests before terminating

```go
func main() {
	// ctx is canceled when SIGINT/SIGTERM is received
	ctx, stop := signal.NotifyContext(context.Background(),
		syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	srv := &http.Server{Addr: ":8080", Handler: mux}
	go srv.ListenAndServe()

	<-ctx.Done() // wait for a signal

	// finish in-flight requests within the grace period, then exit
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}
```

Send logs to standard output (`log` / `log/slog`). The platform picks them up and aggregates them, so
not writing to files yourself is the container way.

## Summary

- Go's strength is "a runtime-free single binary" — shipping and operating it is lightweight
- `CGO_ENABLED=0` + `GOOS/GOARCH` lets you cross-compile a static binary
- Multi-stage Docker + `distroless`/`scratch` gets you an image of a few MB
- Inject config from the outside via environment variables; don't bake in secrets
- Choose PaaS / k8s / VM by scale — while you're small, managed is plenty
- For production, add a health check and graceful shutdown
