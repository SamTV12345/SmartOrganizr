FROM alpine AS cache
RUN apk add -U --no-cache ca-certificates


FROM golang:alpine as backend

WORKDIR /app
# Copy the binary from the build stage
COPY ./api_go/go.mod ./api_go/go.sum ./
RUN go mod download

# Copy the rest of the files
COPY ./api_go .

RUN mkdir -p /app/ui/dist
# Copy frontend build
COPY ./ui/dist/ ./ui/dist/

RUN go build -o app .

FROM scratch as runtime
COPY --from=backend /app/app /app
COPY --from=cache /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ENTRYPOINT ["/app"]