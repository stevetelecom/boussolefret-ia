FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download || true
COPY . .
RUN go build -o /bin/go-api ./cmd/api

FROM alpine:3.20
COPY --from=builder /bin/go-api /usr/local/bin/go-api
EXPOSE 8080
CMD ["go-api"]
