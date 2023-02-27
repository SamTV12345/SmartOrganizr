# <img src="ui/public/package.svg" style="color: black;"/><img src="ui/public/package.svg" style="color: black;"/>  SmartOrganizr

SmartOrganizr is an application designed to make the life of musicians easier. It offers many useful features that help musicians organize and manage their musical activities.

## Features

- Rehearsal and performance management: With SmartOrganizr, musicians can easily plan and manage their rehearsals and performances. They can add, edit, and delete dates, and record all important information such as location, time, and notes to be played.

- Music notation management: SmartOrganizr allows musicians to manage and organize their music notation. They can add, edit, and delete notation. They can also be sorted into folders.

- Artist management: SmartOrganizr also includes a feature that allows musicians to manage their artists. They can add, edit, and delete artists. This enables the musician to keep track of which track was released by which artist. In the future statistics about artists and notes will be added.

## Installation

SmartOrganizr is available as a web application for Windows, Mac, and Linux. To install the application, please follow these steps:

1. Download the docker-compose.yaml file from the root of this project.
2. Add your keycloak configuration.
3. Launch the application by executing ``docker-compose up -d`` and open in your browser http://<your-ip>.

## Usage

After installation, you can start and use SmartOrganizr like any other web based application. You can navigate the pages via the sidebar and add the respective item by clicking the blue plus icon.


## How to dev

### Prerequisites
- Maven
- Keycloak (https://www.keycloak.org/)
- MariaDB (https://mariadb.org/)

### Setup 1
- Start with creating a config.yml file in the root of the project. You can use the config.yml.example file as a template.
- Create a keycloak realm and client. The client should be a public client with the following settings:
    - Access Type: public
    - Valid Redirect URIs: http://localhost:5173/*, http://localhost:8080/*
    - Web Origins: +
- Execute mvn package to build the project and include the ui into the jar.
- Start the application with ``mvn spring-boot:run``. The database migrations will be executed automatically.
- Enter your browser at http://localhost:8080/ui and login with the keycloak credentials.


## Setup 2
- For development purposes, you can also start the application with ``mvn spring-boot:run -Dspring-boot.run.profiles=dev``. This will start the application with CORS enabled. So you can start the React application with live reloading. This should only be used for development purposes as it opens your server for XSS.

If you face any problem you can open an issue on [GitHub](https://github.com/SamTV12345/SmartOrganizr/issues).

## Migration Guide

### 0.1.0 -> 0.2.0

- Execute the SQL command 
```mysql
 UPDATE elements SET pdf_available=0 WHERE type='Note';
```

License
-------

SmartOrganizr is licensed under the [MIT License](LICENSE).
