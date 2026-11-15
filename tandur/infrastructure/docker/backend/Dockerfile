FROM golang:1.24-alpine

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY apps/api/go.mod apps/api/go.sum ./

RUN go mod download

COPY apps/api/ .

EXPOSE 8080

CMD ["go", "run", "./cmd/api"]
