# Spring Fundamentals and JPA

## Spring Fundamentals

### Inversion of Control (IoC) and Dependency Injection (DI)
- **IoC(Inversion of Control)**: Instead of creating and managing objects directly, the control of object creation is delegated to an external container. In Spring, the container manages and provides objects.
- Example of creating an object directly in class A:
```java
public class A {
    b = new B();
}
```
- Example where Spring manages the object:
```java
public class A {
    private B b;
}
```

- **DI(Dependency Injection)**: A class depends on another class, and the dependency is injected by the Spring container.
In the previous example, the developer manually created the B object. With DI, the object is injected instead of being created directly.
- Example of injecting an object:
```java
public class A {
    @Autowired B b;
}
```
@Autowired tells Spring to inject a bean managed by the Spring container.

### Bean and Spring Container
- **Spring Container**: Manages the lifecycle of beans (creation, initialization, destruction).
It also supports dependency injection using annotations like @Autowired.
- **Bean**: An object that is created and managed by the Spring container. 

### Aspect-Oriented Programming (AOP)
- **AOP(Aspect-Oriented Programming)**: Separates cross-cutting concerns (e.g., logging, security, transactions) from core business logic.
This allows developers to focus on core functionality and improves maintainability and flexibility.

### Portable Service Abstraction (PSA)
- **PSA(Portable Service Abstraction)**: Spring abstracts various technologies and provides a consistent programming model.
Developers can use different underlying technologies in a unified way.

### Spring Boot Starters
- **Spring Boot Starter**: A dependency bundle that simplifies configuration.
Naming convention: spring-boot-starter-{type}
- **Common starters**: spring-boot-starter-web, spring-boot-starter-test, spring-boot-starter-validation, spring-boot-starter-actuator, spring-boot-starter-data-jpa

### Auto Configuration
Spring Boot automatically configures the application at startup by reading configuration metadata.

Auto-configuration classes are defined in META-INF/spring.factories.
Understanding this is important when debugging unexpected configurations.

### Components of @SpringBootApplication
- **@SpringBootConfiguration**: Indicates Spring Boot configuration (extends @Configuration).
- **@ComponentScan**: Scans for classes annotated with @Component, @Service, @Repository, etc., and registers them as beans. 
- **@EnableAutoConfiguration**: Enables Spring Boot’s automatic configuration based on dependencies and settings.

## Creating a Spring Boot Project

### Spring Boot 3 Architecture
**Presentation Layer**
- Handles HTTP requests.
- Implemented by Controllers.

**Business Layer**
- Contains business logic.
- Implemented by Services.

**Persistence Layer** 
- Handles database operations.
- Implemented by Repositories.
- May use DAO objects to interact with the database.

### Enhancing a Spring Boot 3 Project
**Adding Dependencies in build.gradle**
```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'com.h2database:h2'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
}
```
- **implementation**: Required at both compile time and runtime.
- **testImplementation**: Used only for test code.
- **runtimeOnly**: Required only at runtime.
- **compileOnly**: Required only at compile time (not included at runtime).
- **annotationProcessor**: Used for processing annotations during compilation.

**Creating Layers**
- Presentation Layer (TestController.java)
```java
@RestController
public class TestController {
    @Autowired
    TestService testService;

    @GetMapping("/test")
    public List<Member> getAllMembers(){
        List<Member> members = testService.getAllMembers();
        return members;
    }
}
```
- Business Layer (TestService.java)
```java
@Service
public class TestService {
    @Autowired
    MemberRepository memberRepository;

    public List<Member> getAllMembers(){
        return memberRepository.findAll();
    }
}
```
- Persistence Layer (Member.java, MemberRepository.java)
```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Getter
@Entity
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;
}
```
```java
public interface MemberRepository extends JpaRepository<Member, Long> {
}
```
- data.sql
```sql
INSERT INTO member (id, name) VALUES (1, 'name 1')
INSERT INTO member (id, name) VALUES (2, 'name 2')
INSERT INTO member (id, name) VALUES (3, 'name 3')
```
- application.yml
```yml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

    defer-datasource-initialization: true
```

**Spring Boot Request-Response Flow**
1. A GET request is sent to /test.
2. The DispatcherServlet analyzes the URL and finds the matching controller method.
3. The controller calls the service layer.
4. The service interacts with the repository to fetch data.
5. The result is returned as a response (JSON format).

## JPA

### ORM (Object Relational Mapping)
- **ORM**: A programming technique that maps Java objects to database tables.
It allows developers to interact with the database using Java objects.

### JPA and Hibernate
- **JPA(Java Persistence API)**: A specification that manages data between Java objects and relational databases.
- **Hibernate**: An implementation of JPA. Internally uses JDBC.
- **Entity**: A class mapped to a database table.
- **Entity Manager**: Manages entities (create, update, delete).
Stores entities in the persistence context.
- **Persistence Context**: A logical storage space that manages entities.
Features: First-level cache, Write-behind (delayed SQL execution), Dirty checking, Lazy loading

### Spring Data and Spring Data JPA
- **Spring Data JPA**: Extends Spring Data and provides convenient methods for using JPA.

JpaRepository extends PagingAndSortingRepository and provides basic CRUD methods.
```java
public interface MemberRepository extends JpaRepository<Member, Long> {
}
```
By specifying <Entity, PrimaryKeyType>, you can use built-in CRUD operations.

**Using Methods Provided by Spring Data JPA**
- insert-members.sql
```sql
INSERT INTO member (id, name) VALUES (1, 'A');
INSERT INTO member (id, name) VALUES (2, 'B');
INSERT INTO member (id, name) VALUES (3, 'C');
```
- application.yml
```yml
spring:
  sql:
    init:
      mode: never
```
- MemberRepositoryTest.java
```java
@DataJpaTest
class MemberRepositoryTest {
    @Autowired
    MemberRepository memberRepository;

    @Sql("/insert-members.sql")
    @Test
    void update(){
        Member member = memberRepository.findById(2L).get();
        member.changeName("BC");
        assertThat(memberRepository.findById(2L).get().getName()).isEqualTo("BC");
    }
}
```
- Member.java
```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Getter
@Entity
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;
    @Column(name = "name", nullable = false)
    private String name;

    public void changeName(String name){
        this.name=name;
    }
}
```
- MemberRepository.java
```java
public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByName(String name);
}
```
