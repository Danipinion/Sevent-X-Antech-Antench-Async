# ==========================================
# Backend Dockerfile for TANDUR API
# ==========================================

# 1. Development Target
FROM golang:1.24-alpine AS dev
WORKDIR /app
RUN apk add --no-cache git
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api ./
EXPOSE 8080
CMD ["go", "run", "./cmd/api/main.go"]

# 2. Builder Stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/tandur-api ./cmd/api/main.go

# 3. Production Runtime
FROM alpine:3.21 AS runner
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /bin/tandur-api /app/tandur-api
EXPOSE 8080
ENTRYPOINT ["/app/tandur-api"]
