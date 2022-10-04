FROM maven:3.8-eclipse-temurin-17 as build

COPY src /usr/src/myapp/src
COPY pom.xml /usr/src/myapp
RUN mvn -f /usr/src/myapp/pom.xml clean package

FROM alpine:latest AS runtime

# Install java runtime as the produces image will be slightly smaller
# than using an jdk base image.
RUN apk --no-cache add openjdk17-jre-headless \
	--repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# Copy the package
COPY --from=build /usr/src/myapp/target/*-SNAPSHOT.jar \
	/app/smartOrganizr.jar

WORKDIR /app
ENTRYPOINT  ["java", "--illegal-access=permit", "-jar","--add-opens","java.base/java.lang=ALL-UNNAMED","smartOrganizr.jar"]
EXPOSE 8080