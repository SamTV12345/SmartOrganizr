FROM maven:3.9.3-amazoncorretto-20 as build

ADD . /usr/src/myapp
COPY settings.xml /.m2/settings.xml
ENV MAVEN_SETTINGS_PATH=/.m2/settings.xml


RUN mvn -f /usr/src/myapp/pom.xml package -Dmaven.repo.local=/.m2/repository -s /.m2/settings.xml

FROM alpine:latest AS runtime

# Install java runtime as the produces image will be slightly smaller
# than using an jdk base image.
RUN apk --no-cache add openjdk20-jre-headless \
	--repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing

# Copy the package
COPY --from=build /usr/src/myapp/api/target/*-SNAPSHOT.jar \
	/app/smartOrganizr.jar

WORKDIR /app
ENTRYPOINT  ["java", "-jar","--add-opens","java.base/java.lang=ALL-UNNAMED","smartOrganizr.jar"]
EXPOSE 8080