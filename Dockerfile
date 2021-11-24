FROM maven:3.8.3-openjdk-17 as BUILD

COPY src /usr/src/myapp/src
COPY pom.xml /usr/src/myapp
RUN mvn -f /usr/src/myapp/pom.xml clean package

FROM openjdk:17-alpine as RUNNING

COPY --from=BUILD /usr/src/myapp/target/smart-organizr-1.0.0-SNAPSHOT.jar /smartOrganizr.jar
ENTRYPOINT ["java","-jar","/library.jar"]