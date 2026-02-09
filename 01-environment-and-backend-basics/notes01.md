# Development Enviroonment Setup & Backend Basics

## Creating a Spring Boot 3 Project

### Modifying the build.gradle File

```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.0'
}

group = 'me.shinsunyoung'
version = '1.0'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    testImplementation 'org.springframework.boot:spring-boot-starter-test' }

test {
    useJUnitPlatform()
}
```

- **plugins**: Adds the Spring Boot plugin (org.springframework.boot) and the dependency management plugin (io.spring.dependency-management) to automatically manage Spring-related dependencies.
- **group / version**: Defines the project's group name and version. These values are used as default identifiers for the project.
- **repositories**: Specifies where dependencies are downloaded from. Here, mavenCentral is used.
- **dependencies**: Declares required dependencies for development. (spring-boot-starter-web: Provides web-related features such as Spring MVC and an embedded server.)
(spring-boot-starter-test: Provides testing support)

### Error Fix - Updating the Gradle Version in gradle-wrapper.properties
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
```

### Creating a New Package and Main Class
```java
package me.shinsunyoung.springbootdeveloper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SpringBootDeveloperApplication {
    public static void main(String[] args){
        SpringApplication.run(SpringBootDeveloperApplication.class, args);
    }
}
```
- This class is the **entry point of the Spring Boot application**. @SpringBootApplication enables auto-configuration and component scanning, and SpringApplication.run() starts embedded web server and lauches the application. 

## Backend Basics

### Server and Client
- **Client**: A program that sends requests to a server.
- **Server**: A system that receives and processes requests from clients.

### Database
When a client sends a reques to a DBMS using SQL (a language for manipulating database), the DBMS retrieves data from the database and returns a response.
- RDB: Relational Database
- SQL: Structured Query Language
- NoSQL: Not Only SQL

### IP Address and Port
- **IP Address**: A unique address used to identify a computer or device on a network.
- **Port**: A number used to distinguish different services running on a server.

### Library and Framework
- **Library**: A collection of reusable code such as classes and functions that provide specific functionality.
- **Framework**: A software development environment that provides a predefined structure to make application development easier.
A framework defines the overall structure of an application, while libraries are used to implement specific features during development.

### Responsibilites of a Backend Developer
1. Task assignment
2. Task analysis
3. Development
4. Testing
5. QA (Quality Assurance)
6. Deployment and maintenance