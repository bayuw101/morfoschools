FROM golang:1.23-alpine AS base

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go test ./...
RUN go build -o /bin/morfosis-api ./cmd/api

FROM alpine:3.21

RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app

COPY --from=base /bin/morfosis-api /bin/morfosis-api

EXPOSE 8080
ENTRYPOINT ["/bin/morfosis-api"]
