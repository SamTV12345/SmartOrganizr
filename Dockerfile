FROM node:latest

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


FROM golang:alpine

WORKDIR /app
# Copy the binary from the build stage
COPY ./api_go/go.mod ./api_go/go.sum ./
RUN go mod download

# Copy the rest of the files
COPY ./api_go .

# Copy frontend build
COPY --from=0 /app/dist ./ui/dist

RUN go build -o app .

FROM scratch as runtime
COPY --from=1 /app/app /app

ENTRYPOINT ["/app"]