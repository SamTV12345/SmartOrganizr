FROM maven:3.8-eclipse-temurin-18 as BUILD

COPY src /usr/src/myapp/src
COPY pom.xml /usr/src/myapp
RUN mvn -f /usr/src/myapp/pom.xml clean package

FROM openjdk:18-alpine as running

EXPOSE 8080

COPY --from=BUILD /usr/src/myapp/target/smart-organizr-*.jar /smartOrganizr.jar
ENTRYPOINT ["java","-jar","/smartOrganizr.jar","--add-opens java.base/java.lang=ALL-UNNAMED"]