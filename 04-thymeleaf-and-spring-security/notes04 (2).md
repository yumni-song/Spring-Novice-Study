# Spring Security

## What is Spring Security?
- **Spring Security**: A Spring sub-framework responsible for application security, including authentication and authorization.
- **Authentication**: The process of verifying a user’s identity.
- **Authorization**: The process of determining whether a user has permission to access a specific resource.

**Spring Security Works Based on Filters**
- UsernamePasswordAuthenticationFilter: Delegates authentication requests when a username and password are submitted.
- FilterSecurityInterceptor: Delegates authorization decisions and handles access control.

**Spring Security Form Login Authentication Flow**
1. When a user enters their username and password in a login form, the credentials are sent through HttpServletRequest.
The AuthenticationFilter validates the incoming credentials.
2. After validation, a UsernamePasswordAuthenticationToken is created.
3. The authentication token is passed to the AuthenticationManager. 
4. The AuthenticationManager forwards it to an AuthenticationProvider.
5. The user’s username is sent to UserDetailsService, which retrieves user information and returns it as a UserDetails object to the AuthenticationProvider.
6. The user information is fetched from the database.
7. The input credentials are compared with the retrieved UserDetails to perform authentication.
8. If authentication is successful, the Authentication object is stored in SecurityContextHolder.
9. Depending on the result:
  - On success → AuthenticationSuccessHandler is executed.
  - On failure → AuthenticationFailureHandler is executed.

## Creating the User Domain
**Steps to Implement Authentication and Authorization**
1. Create a table to store user information and define a domain model.
2. Create a User entity and a repository to retrieve user data.
3. Implement a service that provides user information to Spring Security.

### Add Dependencies
```gradle
dependencies{
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.thymeleaf.extras:thymeleaf-extras-springsecurity6'
    testImplementation 'org.springframework.security:spring-security-test'
}
```

### Create the Entity
- User.java
```java
@Table(name="users")
@NoArgsConstructor(access= AccessLevel.PROTECTED)
@Getter
@Entity
public class User implements UserDetails { 
    // Implements UserDetails so it can be used as an authentication object

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password")
    private String password;

    @Builder
    public User(String email, String password, String auth) {
        this.email = email;
        this.password = password;
    }

    @Override 
    // Returns the user's granted authorities (roles/permissions)
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("user"));
    }

    @Override 
    // Returns the username (unique identifier)
    public String getUsername() {
        return email;
    }

    @Override 
    // Returns the password
    public String getPassword() {
        return password;
    }

    @Override 
    // Indicates whether the account has expired
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override 
    // Indicates whether the account is locked
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override 
    // Indicates whether the credentials (password) have expired
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override 
    // Indicates whether the account is enabled
    public boolean isEnabled() {
        return true;
    }
}
```

### Create the Repository
- UserRepository.java
```java
public interface UserRepository extends JpaRepository<User, Long> {
    // Retrieve user information by email
    Optional<User> findByEmail(String email); 
}
```

### Create the Service Class
- UserDetailService.java
```java
@RequiredArgsConstructor
@Service
// Service used by Spring Security to retrieve user information
public class UserDetailService implements UserDetailsService {
    private final UserRepository userRepository;

    // Load user information using the username (email)
    @Override
    public UserDetails loadUserByUsername(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException((email)));
    }
}
```

## Configuring Spring Security
- WebSecurityConfig.java
```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class WebSecurityConfig {

   private final UserDetailService userService;

   // 1. Disable certain Spring Security features (ignore specific paths)
   @Bean
   public WebSecurityCustomizer configure() {
       return (web) -> web.ignoring()
               .requestMatchers(toH2Console())
               .requestMatchers(new AntPathRequestMatcher("/static/**"));
   }

   // 2. Configure web-based security for specific HTTP requests
   @Bean
   public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
       return http
               .authorizeRequests(auth -> auth // 3. Authentication and authorization settings
                       .requestMatchers(
                               new AntPathRequestMatcher("/login"),
                               new AntPathRequestMatcher("/signup"),
                               new AntPathRequestMatcher("/user")
                       ).permitAll()
                       .anyRequest().authenticated())
               .formLogin(formLogin -> formLogin // 4. Configure form-based login
                       .loginPage("/login")
                       .defaultSuccessUrl("/articles")
               )
               .logout(logout -> logout // 5. Configure logout
                       .logoutSuccessUrl("/login")
                       .invalidateHttpSession(true)
               )
               .csrf(AbstractHttpConfigurer::disable) // 6. Disable CSRF (for development/testing)
               .build();
   }

   // 7. Configure AuthenticationManager
   @Bean
   public AuthenticationManager authenticationManager(HttpSecurity http,
                                                      BCryptPasswordEncoder bCryptPasswordEncoder,
                                                      UserDetailService userDetailService) throws Exception {
       DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
       authProvider.setUserDetailsService(userService); // 8. Set custom user details service
       authProvider.setPasswordEncoder(bCryptPasswordEncoder);
       return new ProviderManager(authProvider);
   }

   // 9. Register password encoder bean
   @Bean
   public BCryptPasswordEncoder bCryptPasswordEncoder() {
       return new BCryptPasswordEncoder();
   }
}
```

## Implementing User Registration
### Create Service Method
- AddUserRequest.java
```java
@Getter
@Setter
public class AddUserRequest {
    private String email;
    private String password;
}
```
- UserService.java
```java
@RequiredArgsConstructor
@Service
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    public Long save(AddUserRequest dto) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        return userRepository.save(User.builder()
                .email(dto.getEmail())
                // Encrypt password before saving
                .password(bCryptPasswordEncoder.encode(dto.getPassword()))
                .build()).getId();
    }
}
```

### Create Controller for User Registration
- UserApiController.java
```java
@RequiredArgsConstructor
@Controller
public class UserApiController {
    private final UserService userService;

    @PostMapping("/user")
    public String signup(AddUserRequest request) {
        userService.save(request); // Call registration service
        return "redirect:/login"; // Redirect to login page after successful signup
    }
}
```

## Implement Signup and Login Views
### View Controller
- UserViewController.java
```java
@Controller
public class UserViewController {
    @GetMapping("/login")
    public String login() {
        return "oauthlogin";
    }

    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }
}
```
- Accessing /login returns oauthlogin.html
- Accessing /signup returns signup.html

## Implement Logout
### Add Logout Method
- UserApiController.java
```java
@RequiredArgsConstructor
@Controller
public class UserApiController {
    private final UserService userService;
    @GetMapping("/logout")
    public String logout(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        return "redirect:/login";
    }
}
```
When a GET request is sent to /logout, the SecurityContextLogoutHandler's logout() method is called to perform logout processing.

## Running and Testing
### Add Environment Configuration for Testing
- application.yml
```yml
  datasource: 
    url: jdbc:h2:mem:testdb
    username: sa
  h2: 
    console:
      enabled: true
```
- Configure an in-memory H2 database
- Enable H2 console access for development/testing