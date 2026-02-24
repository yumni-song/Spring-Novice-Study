# Implement Login/Logout with JWT

## Token-Based Authentication
### What Is Token-Based Authentication?
- **Session-Based Authentication**: Session-based authentication creates and stores a session on the server for each authenticated user.
The server maintains user state by storing session information (such as user identity) and associates it with a session ID.
- **Token-Based Authentication**: In token-based authentication, a token is a unique value used by the server to identify a client.
After successful authentication, the server generates a token and sends it to the client. The client stores this token and includes it in subsequent requests.

The server verifies the token to determine whether the request comes from a valid user.

**Token Authentication Flow**
1. The client sends an authentication request to the server with a username and password.
2. The server verifies the credentials. If valid, it generates a token and returns it to the client.
3. The client stores the token.
4. When accessing APIs that require authentication, the client includes the token in the request.
5. The server validates the token.
6. If the token is valid, the server processes the client’s request.

**Characteristics of Token-Based Authentication**
- Statelessness: The server does not store session information.
- Scalability: Since no session storage is required, it is easier to scale across multiple servers.
- Integrity: Tokens (especially JWT) are signed, ensuring they have not been tampered with.

### JWT (JSON Web Token)
A JWT consists of three parts:
- **Header**: The header contains information about the token type and the hashing algorithm used.
  - Token type: JWT
  - Signing algorithm: HS256
- **Payload**: The payload contains information about the token, called claims.
A claim is a key-value pair. Claims are divided into three types:
  - Registered Claims: Predefined claims that provide information about the token (e.g., iss, exp, sub).
  - Public Claims: Claims that can be publicly shared. To prevent naming conflicts, they should use collision-resistant names, often formatted as URIs.
  - Private Claims: Custom claims defined between the client and server. These are typically used for application-specific purposes (e.g., user ID).
- **Signature**: The signature ensures that the token has not been altered.
It is created by:
1. Encoding the header
2. Encoding the payload
3. Combining both
4. Generating a hash using a secret key and a specified algorithm
If the token is modified, the signature validation will fail.

#### Token Expiration
**Refresh Token**
A refresh token is separate from an access token.
It is **not used for authentication directly**, but is used to issue a new access token when the current access token expires.
Best practice:
- Set a **short expiration time** for access tokens.
- Set a **longer expiration time** for refresh tokens.
This improves security. Even if an attacker steals an access token, it will expire quickly and become unusable.

**Refresh Token Flow**
1. The client sends an authentication request to the server.
2. The server verifies the credentials and generates both an access token and a refresh token.
3. The client stores both tokens.
4. The server stores the refresh token in the database.
5. When calling an API that requires authentication, the client includes the access token.
6. The server validates the access token. If valid, it processes the request.
7. After some time, the access token expires. The client attempts to call an API again.
8. The server checks the access token and returns an error indicating that it has expired.
9. The client sends a request to issue a new access token, including the stored refresh token.
10. The server validates the refresh token and checks whether it matches the one stored in the database.
11. If valid, the server issues a new access token.
12. The client retries the API request using the new access token.

## Implementing the JWT Service
### Add Dependencies
- build.gradle
```gradle
dependencies {
    testCompileOnly 'org.projectlombok:lombok'
    testAnnotationProcessor 'org.projectlombok:lombok'
    implementation 'io.jsonwebtoken:jjwt:0.9.1'
    implementation 'javax.xml.bind:jaxb-api:2.3.1'
}
```

### Add Token Provider Configuration
- application.yml
```yml
jwt:
  issuer: ajufresh@gmail.com
  secret_key: study-springboot
```
- JwtProperties.java
```java
@Setter
@Getter
@Component
@ConfigurationProperties("jwt") // Binds properties with the prefix "jwt" from application.yml to this class
public class JwtProperties {
    private String issuer;
    private String secretKey;
}
```
- TokenProvider.java
```java
@RequiredArgsConstructor
@Service
public class TokenProvider {

    private final JwtProperties jwtProperties;

    // Generates a JWT token using user information and expiration duration
    public String generateToken(User user, Duration expiredAt) {
        Date now = new Date();
        return makeToken(new Date(now.getTime()+expiredAt.toMillis()), user);
    }

    // Creates the actual JWT token
    private String makeToken(Date expiry, User user) {
        Date now = new Date();

        return Jwts.builder()
                .setHeaderParam(Header.TYPE, Header.JWT_TYPE) 
                // Header: type = JWT
                .setIssuer(jwtProperties.getIssuer()) // iss: issuer
                .setIssuedAt(now) // iat: issued at
                .setExpiration(expiry) // exp: expiration time
                .setSubject(user.getEmail()) // sub: user email
                .claim("id", user.getId()) // custom claim: user ID
                // Signature: encrypted using HS256 algorithm with secret key
                .signWith(SignatureAlgorithm.HS256, jwtProperties.getSecretKey())
                .compact();
    }

    // Validates the JWT token
    public boolean validToken(String token) {
        try {
            Jwts.parser()
                    .setSigningKey(jwtProperties.getSecretKey()) // verify using secret key
                    .parseClaimsJws(token);
            return true;
        } catch (Exception e) { return false; } // If parsing fails, the token is invalid
    }

    // Retrieves authentication information from the token
    public Authentication getAuthentication(String token) {
        Claims claims = getClaims(token);
        Set<SimpleGrantedAuthority> authorities = Collections.singleton(new SimpleGrantedAuthority("ROLE_USER"));

        return new UsernamePasswordAuthenticationToken(new org.springframework.security.core.userdetails.User(claims.getSubject(), "", authorities), token, authorities);
    }

    // Retrieves user ID from the token
    public Long getUserId(String token) {
        Claims claims = getClaims(token);
        return claims.get("id", Long.class);
    }

    private Claims getClaims(String token) {
        return Jwts.parser() // Extracts claims from the token
                .setSigningKey(jwtProperties.getSecretKey())
                .parseClaimsJws(token)
                .getBody();
    }
}
```
- JwtFactory.java
```java
@Getter
public class JwtFactory {
    private String subject = "test@email.com";
    private Date issuedAt = new Date();
    private Date expiration = new Date(new Date().getTime() + Duration.ofDays(14).toMillis());
    private Map<String, Object> claims = emptyMap();

    // Builder pattern allows selective configuration
    @Builder
    public JwtFactory(String subject, Date issuedAt, Date expiration, Map<String, Object> claims) {
        this.subject = subject != null ? subject : this.subject;
        this.issuedAt = issuedAt != null ? issuedAt : this.issuedAt;
        this.expiration = expiration != null ? expiration : this.expiration;
        this.claims = claims != null ? claims : this.claims;
    }
    // Creates a factory with default values
    public static JwtFactory withDefaultValues() { return JwtFactory.builder().build(); }

    // Creates a JWT token using the jjwt library
    public String createToken(JwtProperties jwtProperties) {
        return Jwts.builder()
                .setSubject(subject)
                .setHeaderParam(Header.TYPE, Header.JWT_TYPE)
                .setIssuer(jwtProperties.getIssuer())
                .setIssuedAt(issuedAt)
                .setExpiration(expiration)
                .addClaims(claims)
                .signWith(SignatureAlgorithm.HS256, jwtProperties.getSecretKey())
                .compact();
    }
}
```
- TokenProviderTest.java
```java
@SpringBootTest
class TokenProviderTest {
    @Autowired
    private TokenProvider tokenProvider;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtProperties jwtProperties;

    // Test for generateToken()
    @DisplayName("generateToken(): 유저 정보와 만료 기간을 전달해 토큰을 만들 수 있다.")
    @Test
    void generateToken() {
        // given
        User testUser = userRepository.save(User.builder()
                .email("user@gmail.com")
                .password("test")
                .build());
        //when
        String token = tokenProvider.generateToken(testUser, Duration.ofDays(14));
        //then
        Long userId = Jwts.parser()
                .setSigningKey(jwtProperties.getSecretKey())
                .parseClaimsJws(token)
                .getBody()
                .get("id", Long.class);

        assertThat(userId).isEqualTo(testUser.getId());
    }
    // Test for expired token validation
    @DisplayName("validToken(): 만료된 토큰인 경우에 유효성 검증에 실패한다.")
    @Test
    void validToken_invalidToken() {
        // given
        String token = JwtFactory.builder()
                .expiration(new Date(new Date().getTime() - Duration.ofDays(7).toMillis()))
                .build()
                .createToken(jwtProperties);
        // when
        boolean result = tokenProvider.validToken(token);
        // then
        assertThat(result).isFalse();
    }


    @DisplayName("validToken(): 유효한 토큰인 경우에 유효성 검증에 성공한다.")
    @Test
    // given
    void validToken_validToken() {
        String token = JwtFactory.withDefaultValues()
                .createToken(jwtProperties);
        // when
        boolean result = tokenProvider.validToken(token);
        // then
        assertThat(result).isTrue();
    }

    // Test for getAuthentication()
    @DisplayName("getAuthentication(): 토큰 기반으로 인증정보를 가져올 수 있다.")
    @Test
    void getAuthentication() {
        // given
        String userEmail = "user@email.com";
        String token = JwtFactory.builder()
                .subject(userEmail)
                .build()
                .createToken(jwtProperties);
        // when
        Authentication authentication = tokenProvider.getAuthentication(token);
        // then
        assertThat(((UserDetails) authentication.getPrincipal()).getUsername()).isEqualTo(userEmail);
    }
    // Test for getUserId()
    @DisplayName("getUserId(): 토큰으로 유저 ID를 가져올 수 있다.")
    @Test
    void getUserId() {
        // given
        Long userId = 1L;
        String token = JwtFactory.builder()
                .claims(Map.of("id", userId))
                .build()
                .createToken(jwtProperties);
        // when
        Long userIdByToken = tokenProvider.getUserId(token);
        // then
        assertThat(userIdByToken).isEqualTo(userId);
    }
}
```

### Implement Refresh Token Domain
- RefreshToken.java
```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
@Entity
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "refresh_token", nullable = false)
    private String refreshToken;

    public RefreshToken(Long userId, String refreshToken) {
        this.userId = userId;
        this.refreshToken = refreshToken;
    }

    public RefreshToken update(String newRefreshToken) {
        this.refreshToken = newRefreshToken;
        return this;
    }
}
```
- RefreshTokenRepository.java
```java
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByUserId(Long userId);
    Optional<RefreshToken> findByRefreshToken(String refreshToken);
}
```

### Implement Token Filter
- **Filter**: A component that intercepts requests before and/or after they reach the core request-handling logic.
When a request comes in, the filter checks the header value to see whether a token exists. If a valid token is found, it stores the authentication information in the SecurityContextHolder.
- **SecurityContext**: A storage area that holds the Authentication object.
It is stored in a thread-local space (one per thread), so it can be accessed from anywhere in the code and is not shared across threads—making it safe and independent.
- **SecurityContextHolder**: A holder class that stores and provides access to the SecurityContext.

- TokenAuthenticationFilter.java
```java
@RequiredArgsConstructor
public class TokenAuthenticationFilter extends OncePerRequestFilter {
    private final TokenProvider tokenProvider;
    private final static String HEADER_AUTHORIZATION = "Authorization";
    private final static String TOKEN_PREFIX = "Bearer";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        // Read the value of the "Authorization" header from the request
        String authorizationHeader = request.getHeader(HEADER_AUTHORIZATION);
        // Remove the prefix (e.g., "Bearer") to extract the actual token
        String token = getAccessToken(authorizationHeader);
        // If the token is valid, set the authentication in the SecurityContext
        if (tokenProvider.validToken(token)) {
            Authentication authentication = tokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String getAccessToken(String authorizationHeader) {
        if (authorizationHeader != null && authorizationHeader.startsWith(TOKEN_PREFIX)) {
            return authorizationHeader.substring(TOKEN_PREFIX.length());
        }
        return null;
    }
}
```

## Implement Token API
### Add Token Service
Create a service class that receives a refresh token and uses the TokenProvider to generate a new access token.

- UserService.java
Method to find and return a user by the provided user ID.
```java
    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Unexpected User"));
    }
```

- RefreshTokenService.java
Method to find and return a RefreshToken entity by the provided refresh token.
```java
@RequiredArgsConstructor
@Service
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshToken findByRefreshToken(String refreshToken) {
        return refreshTokenRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new IllegalArgumentException("Unexpected token"));
    }
}
```
- TokenService.java
  - createNewAccessToken(): Validates the refresh token. If valid, it finds the user ID from the refresh token.
  - generateToken(): Called after finding the user ID, and generates a new access token.
```java
@RequiredArgsConstructor
@Service
public class TokenService {
    private final TokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final UserService userService;

    public String createNewAccessToken(String refreshToken) {
        // Throw an exception if token validation fails
        if(!tokenProvider.validToken(refreshToken)) {
            throw new IllegalArgumentException("Unexpected token");
        }
        Long userId = refreshTokenService.findByRefreshToken(refreshToken).getUserId();
        User user = userService.findById(userId);
        // Generate a new access token (valid for 2 hours)
        return tokenProvider.generateToken(user, Duration.ofHours(2));
    }
}
```

### Add Controller
- CreateAccessTokenRequest.java
```java
@Getter
@Setter
public class CreateAccessTokenRequest {
    private String refreshToken;
}
```
- CreateAccessTokenResponse.java
```java
@AllArgsConstructor
@Getter
public class CreateAccessTokenResponse {
    private String accessToken;
}
```
- TokenApiController.java
When a POST request is sent to /api/token, it creates a new access token based on the refresh token.
```java
@RequiredArgsConstructor
@RestController
public class TokenApiController {
    private final TokenService tokenService;

    @PostMapping("/api/token")
    public ResponseEntity<CreateAccessTokenResponse> createNewAccessToken
            (@RequestBody CreateAccessTokenRequest request) {
        String newAccessToken = tokenService.createNewAccessToken(request.getRefreshToken());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateAccessTokenResponse(newAccessToken));
    }
}
```
- TokenApiControllerTest.java
```java
@SpringBootTest
@AutoConfigureMockMvc
public class TokenApiControllerTest {
    @Autowired
    protected MockMvc mockMvc;
    @Autowired
    protected ObjectMapper objectMapper;
    @Autowired
    private WebApplicationContext context;
    @Autowired
    JwtProperties jwtProperties;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    public void mockMvcSetUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .build();
        userRepository.deleteAll();
    }

    @DisplayName("createNewAccessToken: 새로운 액세스 토큰을 발급한다.")
    @Test
    public void createNewAccessToken() throws Exception {
        // given
        final String url = "/api/token";

        User testUser = userRepository.save(User.builder()
                .email("user@gmail.com")
                .password("test")
                .build());

        String refreshToken = JwtFactory.builder()
                .claims(Map.of("id", testUser.getId()))
                .build()
                .createToken(jwtProperties);

        refreshTokenRepository.save(new RefreshToken(testUser.getId(), refreshToken));

        CreateAccessTokenRequest request = new CreateAccessTokenRequest();
        request.setRefreshToken(refreshToken);
        final String requestBody = objectMapper.writeValueAsString(request);
        // when 
        ResultActions resultActions = mockMvc.perform(post(url)
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(requestBody));
        // then
        resultActions
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }
}
```
**Test Scenario Explanation (Given / When / Then)**
- Given: Create a test user, generate a refresh token using the jjwt library, and store it in the database.
Then create a request object that includes the refresh token in the API request body.
- When: Send a request to the token creation API. The request type is JSON, and the object created in the given step is sent as the request body.
- Then: Check whether the response status is 201 Created, and verify that the returned access token is not empty.