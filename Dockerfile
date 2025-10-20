FROM alpine AS cache
RUN apk add -U --no-cache ca-certificates

FROM node:latest as frontend

WORKDIR /app
RUN npm install -g pnpm@latest

# Copy the package.json and install the dependencies
COPY ./ui/package.json .
COPY ./ui/pnpm-lock.yaml .
RUN pnpm install

# Copy the rest of the files
COPY ./ui .

# Build the app
RUN pnpm run build

FROM golang:alpine as backend

WORKDIR /app
# Copy the binary from the build stage
COPY ./api_go/go.mod ./api_go/go.sum ./
RUN go mod download

# Copy the rest of the files
COPY ./api_go .

# Copy frontend build
COPY --from=frontend /app/dist ./ui/dist

RUN go build -o app .

FROM alpine:3 as runtime

EXPOSE 8080

COPY --from=backend /app/app /app
COPY --from=cache /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ENTRYPOINT ["/app"]