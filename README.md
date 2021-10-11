# SMARTORGANIZR

Smartorganizr is a responsive, feature-packed Java Server Faces application which lets you organise your IRL folders.


## Installation
The application can be run with 
```
mvn spring-boot:run
```

For using a persistent database you need to create a config.properties folder in the root directory of the project 
(Where the **pom.xml** is located). The important config properties are:

- spring.datasource.url=<url-to-database>
- spring.datasource.username=<your-username>
- spring.datasource.password=<your-password
- spring.jpa.hibernate.ddl-auto=update



