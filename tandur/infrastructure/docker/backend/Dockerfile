FROM golang:alpine

WORKDIR /app

COPY apps/api/ .
COPY database/migrations /migrations

EXPOSE 8080

CMD ["go", "run", "./cmd/api"]
