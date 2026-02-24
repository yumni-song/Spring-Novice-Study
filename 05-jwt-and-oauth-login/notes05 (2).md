# Implement Login/Logout with OAuth2

## OAuth
### What Is OAuth?
**OAuth (Open Authorization)** is an authorization framework that allows a third-party service to manage user authentication and access to protected resources. Instead of directly handling user credentials, the application delegates authentication to an external provider such as Google, Naver, or Facebook.

### Key Roles in OAuth
- **Resource Owner**: The entity that grants permission to access protected resources. Typically, this is the user who owns the data.
- **Resource Server**: The server that stores and protects the resource owner's data. Examples include Google, Naver, and Facebook.
- **Authorization Server**: The server that authenticates the resource owner and issues access tokens to the client application.
- **Client Application**: The application that requests access to the resource owner's data after being authorized by the authorization server. 

### Authorization Code Grant Type
The Authorization Code Grant is one of the most secure and commonly used OAuth2 flows.

### Authorization Code Flow
**1. Authorization Request**
The Spring Boot server sends a request to the authorization server to access specific user data. Although the request URI differs by provider, it usually includes the following parameters:
- client_id: Unique identifier assigned to the client by the authorization server
- redirect_uri: URI to redirect the user after successful login
- response_type: The type of response expected (usually code)
- scope: The list of user information the client wants to access

**2. User Authentication and Consent**
If this is the first authorization request:
- The authorization server presents a login page.
- The user logs in and grants permission to access their data.
If consent was previously granted, only login may be required. Once authentication succeeds, the authorization server grants access permission.

**3. Authorization Code Issued**
After successful login, the user is redirected to the provided redirect_uri. An authorization code is included as a query parameter in the redirect URL.

**4. Access Token Exchange**
The client application exchanges the authorization code for an access token. An access token is a credential that proves the client has permission to access protected resources.

**5. Access Resource Using Access Token**
The client uses the access token to request user information from the resource server.
Each time an API call is made:
- The resource server validates the access token.
- If valid, it returns the requested data.

### What Is a Cookie?
A **cookie** is a small piece of data stored in the client’s local environment (browser) by a website server.
Cookies consist of:
- Key-value pairs
- Expiration time
- Domain information
- Path and security settings
Cookies are sent automatically with HTTP requests to the corresponding domain.

### Cookie Storage Flow
**1. Server Creates Cookie**
When a client requests information, the server generates a cookie containing specific data. The cookie is sent back in the HTTP response header.

**2. Client Stores Cookie**
The client (browser) stores the cookie locally.

**3. Client Sends Cookie on Subsequent Requests**
When the user revisits the site, the browser automatically sends the stored cookie along with the HTTP request.

**4. Server Uses Cookie Data**
Because the client stores the cookie, the server can:
- Identify the user
- Maintain login state
- Provide personalized information

## Implementing and Applying OAuth2 with Spring Security

### Add Dependency
- build.gradle
```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
}
```

### Implement Cookie Utility Class
During the OAuth2 authentication flow, cookies are used to temporarily store authorization request data. Instead of repeatedly writing cookie creation and deletion logic, we create a reusable utility class.
- CookieUtil.java
```java
public class CookieUtil {
    // Add a cookie with the given name, value, and expiration time
    public static void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }
    // Delete a cookie by name
    public static void deleteCookie(HttpServletRequest request, HttpServletResponse response, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return;
        }

        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                cookie.setValue("");
                cookie.setPath("/");
                cookie.setMaxAge(0);
                response.addCookie(cookie);
            }
        }
    }
    // Serialize an object into a Base64-encoded string
    public static String serialize(Object obj) {
        return Base64.getUrlEncoder()
                .encodeToString(SerializationUtils.serialize(obj));
    }
    // Deserialize a cookie value back into an object
    public static <T> T deserialize(Cookie cookie, Class<T> cls) {
        return cls.cast(
                SerializationUtils.deserialize(
                        Base64.getUrlDecoder().decode(cookie.getValue())
                )
        );
    }
}
```

### Implement OAuth2 Service
- User.java
The User entity implements UserDetails and includes a nickname field.
```java
public class User implements UserDetails {
    
    @Column(name = "nickname", unique = true)
    private String nickname;
    
    @Builder
    public User(String email, String password, String nickname) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
    }
    // Update nickname
    public User update(String nickname) {
        this.nickname = nickname;
        return this;
    }
}
```
- OAuth2UserCustomService.java
OAuth2UserCustomService extends DefaultOAuth2UserService to handle user information received from the OAuth2 provider.
```java
@RequiredArgsConstructor
@Service
public class OAuth2UserCustomService extends DefaultOAuth2UserService {
    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User user = super.loadUser(userRequest);
        saveOrUpdate(user);
        return user;
    }
    // Update existing user or create a new one
    private User saveOrUpdate(OAuth2User oAuth2User) {
        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");
        User user = userRepository.findByEmail(email)
                .map(entity -> entity.update(name))
                .orElse(User.builder().email(email).nickname(name).build());
        return userRepository.save(user);
    }
}
```

### Configure OAuth2 Security
- WebOAuthSecurityConfig.java
This configuration disables session-based authentication and enables JWT-based stateless authentication with OAuth2 login.
```java
@RequiredArgsConstructor
@Configuration
public class WebOAuthSecurityConfig {
    private final OAuth2UserCustomService oAuth2UserCustomService;
    private final TokenProvider tokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserService userService;

    @Bean
    public WebSecurityCustomizer configure() { // Disable Default Security Features
        return (web) -> web.ignoring()
                .requestMatchers(toH2Console())
                .requestMatchers(
                        new AntPathRequestMatcher("/img/**"),
                        new AntPathRequestMatcher("/css/**"),
                        new AntPathRequestMatcher("/js/**")
                );
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(management ->
                        management.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Add JWT Authentication Filter
                .addFilterBefore(tokenAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                // Configure URL Authorization
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(new AntPathRequestMatcher("/api/token")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/**")).authenticated()
                        .anyRequest().permitAll())
                // Configure OAuth2 Login
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/login")
                        .authorizationEndpoint(authorizationEndpoint ->
                                authorizationEndpoint.authorizationRequestRepository(oAuth2AuthorizationRequestBasedOnCookieRepository()))
                        .userInfoEndpoint(userInfoEndpoint ->
                                userInfoEndpoint.userService(oAuth2UserCustomService))
                        .successHandler(oAuth2SuccessHandler())
                )
                // Exception Handling
                .exceptionHandling(exceptionHandling -> exceptionHandling
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                new AntPathRequestMatcher("/api/**")
                        ))
                .build();
    }

    @Bean
    public OAuth2SuccessHandler oAuth2SuccessHandler() {
        return new OAuth2SuccessHandler(tokenProvider,
                refreshTokenRepository,
                oAuth2AuthorizationRequestBasedOnCookieRepository(),
                userService
        );
    }

    @Bean
    public TokenAuthenticationFilter tokenAuthenticationFilter() {
        return new TokenAuthenticationFilter(tokenProvider);
    }

    @Bean
    public OAuth2AuthorizationRequestBasedOnCookieRepository oAuth2AuthorizationRequestBasedOnCookieRepository() {
        return new OAuth2AuthorizationRequestBasedOnCookieRepository();
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```
- OAuth2AuthorizationRequestBasedOnCookieRepository.java
This class implements AuthorizationRequestRepository to persist the OAuth2 authorization request using cookies during the authentication flow.
```java
public class OAuth2AuthorizationRequestBasedOnCookieRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {
    public final static String OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME = "oauth2_auth_request";
    private final static int COOKIE_EXPIRE_SECONDS = 18000;

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest
                                                                         request, HttpServletResponse response) {
        return this.loadAuthorizationRequest(request);
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest
                                                                       request) {
        Cookie cookie = WebUtils.getCookie(request, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
        return CookieUtil.deserialize(cookie, OAuth2AuthorizationRequest.class);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest
                                                 authorizationRequest, HttpServletRequest request, HttpServletResponse response) {

        if (authorizationRequest == null) {
            removeAuthorizationRequestCookies(request, response);
            return;
        }
        CookieUtil.addCookie(response, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME,
                CookieUtil.serialize(authorizationRequest), COOKIE_EXPIRE_SECONDS);
    }

    public void removeAuthorizationRequestCookies(HttpServletRequest request,
                                                  HttpServletResponse response) {
        CookieUtil.deleteCookie(request, response, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
    }
}
```
- UserService.java
This service handles user-related operations. When saving a new user, the password is encrypted using BCryptPasswordEncoder. The findByEmail() method is added to retrieve a user by email after OAuth2 authentication.
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
                .password(bCryptPasswordEncoder.encode(dto.getPassword()))
                .build()).getId();
    }

    public User findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Unexpected User"));
    }

    public  User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Unexpected user"));
    }
}
```
- OAuth2SuccessHandler.java
This handler is executed when OAuth2 authentication succeeds. It generates both refresh and access tokens, stores the refresh token, sets it in a cookie, and redirects the user.
```java
@RequiredArgsConstructor
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
    public static final Duration REFRESH_TOKEN_DURATION = Duration.ofDays(14);
    public static final Duration ACCESS_TOKEN_DURATION = Duration.ofDays(1);
    public static final String REDIRECT_PATH = "/articles";

    private final TokenProvider tokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OAuth2AuthorizationRequestBasedOnCookieRepository authorizationRequestRepository;
    private final UserService userService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = (String) oAuth2User.getAttributes().get("email");
        User user = userService.findByEmail(email);

        // 1. Generate refresh token -> save to DB -> store in cookie
        String refreshToken = tokenProvider.generateToken(user, REFRESH_TOKEN_DURATION);
        saveRefreshToken(user.getId(), refreshToken);
        addRefreshTokenToCookie(request, response, refreshToken);
        // 2. Generate access token -> append to redirect URL
        String accessToken = tokenProvider.generateToken(user, ACCESS_TOKEN_DURATION);
        String targetUrl = getTargetUrl(accessToken);
        // 3. Clear authentication-related attributes and cookies
        clearAuthenticationAttributes(request, response);
        // 4. Redirect to target URL
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
    // Save or update the refresh token in the database
    private void saveRefreshToken(Long userId, String newRefreshToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByUserId(userId)
                .map(entity -> entity.update(newRefreshToken))
                .orElse(new RefreshToken(userId, newRefreshToken));

        refreshTokenRepository.save(refreshToken);
    }
    // Store the refresh token in a cookie
    private void addRefreshTokenToCookie(HttpServletRequest request, HttpServletResponse response, String refreshToken) {
        int cookieMaxAge = (int) REFRESH_TOKEN_DURATION.toSeconds();
        CookieUtil.deleteCookie(request, response, REFRESH_TOKEN_COOKIE_NAME);
        CookieUtil.addCookie(response, REFRESH_TOKEN_COOKIE_NAME, refreshToken, cookieMaxAge);
    }
    // Clear authentication-related attributes and OAuth2 cookies
    private void clearAuthenticationAttributes(HttpServletRequest request, HttpServletResponse response) {
        super.clearAuthenticationAttributes(request);
        authorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
    }
    // Add access token as a query parameter to the redirect URL
    private String getTargetUrl(String token) {
        return UriComponentsBuilder.fromUriString(REDIRECT_PATH)
                .queryParam("token", token)
                .build()
                .toUriString();
    }
}
```
### OAuth2 Authentication Flow Summary
**1. Generate, store, and set refresh token in cookie**
A refresh token is generated using TokenProvider. It is stored in the database along with the user ID. Then, it is added to a cookie so that the client can request a new access token when the current one expires.
**2. Generate access token and append it to redirect URL**
An access token is generated and added as a query parameter to the redirect path.
**3. Clear authentication-related session and cookies**
Temporary authentication data stored during the OAuth2 process is removed. This includes both default authentication attributes and OAuth2-related cookies.
**4. Redirect**
The user is redirected to the target URL with the access token attached.

### Adding Author Information to Articles
To associate each article with the user who created it, we add an author field and pass the authenticated user's name when saving the article.
- Article.java
Add an author field to the entity and include it in the builder constructor.
```java
public class Article {
    @Column(name = "author", nullable = false)
    private String author;

    @Builder
    public Article(String author, String title, String content) {
        this.author = author;
        this.title = title;
        this.content = content;
    }
}
```
- AddArticleRequest.java
Modify toEntity() so that the authenticated user's name is passed as the author.
```java
    public Article toEntity(String author) {

        return Article.builder().title(title).content(content).author(author).build();
    }
```
- BlogService.java
When saving an article, pass the authenticated username.
```java
    public Article save(AddArticleRequest request, String userName) {
        return blogRepository.save(request.toEntity(userName));
    }
```
- BlogApiController.java
Use Principal to retrieve the currently authenticated user's name.
```java
    @PostMapping("/api/articles")
    public ResponseEntity<Article> addArticle(@RequestBody AddArticleRequest request, Principal principal) {
        Article savedArticle = blogService.save(request, principal.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(savedArticle);
    }
```
- ArticleViewResponse.java
Expose the author field in the response DTO.
```java
private String author;
this.author = article.getAuthor();
```
- data.sql
Add sample data including author values.
```sql
INSERT INTO article (title, content, author, created_at, updated_at) VALUES ('제목 1', '내용 1', 'user1', NOW(), NOW());
INSERT INTO article (title, content, author, created_at, updated_at) VALUES ('제목 2', '내용 2', 'user2', NOW(), NOW());
INSERT INTO article (title, content, author, created_at, updated_at) VALUES ('제목 3', '내용 3', 'user3', NOW(), NOW());
```
- article.html
Display author information in the article view.
```html
<div class="text-muted fst-italic mb-2" th:text="|Posted on
                    ${#temporals.format(article.createdAt, 'yyyy-mm-dd HH:mm')} By ${article.author}|"></div>
```

### Building OAuth View Pages
- UserViewController.java
Handles login and signup page routing.
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
- oauthLogin.html
Simple OAuth login page with Google login button.
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css">
    <style>
        .gradient-custom {
            background: #6a11cb;
            background: -webkit-linear-gradient(to right, rgba(106, 17, 203, 1),
            rgba(37, 117, 252, 1));
            background: linear-gradient(to right, rgba(106, 17, 203, 1), rgba(37, 117, 252, 1))
        }
    </style>
</head>
<body class="gradient-custom">
<section class="d-flex vh-100">
    <div class="container-fluid row justify-content-center align-content-center">
        <div class="card bg-dark" style="border-radius: 1rem">
            <div class="card-body p-5 text-center">
                <h2 class="text-white">LOGIN</h2>
                <p class="text-white-50 mt-2 mb-5">서비스 사용을 위해 로그인을 해주세요!</p>
                <div class="mb-2">
                    <a href="/oauth2/authorization/google">
                        <img src="/static.img/google.png">
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>
</body>
</html>
```
### Handling Access Token on the Client Side
- token.js
Store the access token from the URL query parameter into local storage.
```js
const token = searchParam('token')

if (token) {
    localStorage.setItem("access_token", token)
}
function searchParam(key) {
    return new URLSearchParams(location.search).get(key);
}
```
- articleList.html
```html
<script src="/js/token.js"></script>
```
- article.js
This script sends API requests with the access token attached in the Authorization header. If the server responds with 401 Unauthorized, it attempts to obtain a new access token using the refresh token stored in cookies. After receiving the new access token, it retries the original request automatically. The same reusable httpRequest() function is used for create, update, and delete operations.
```js
// Create article
const createButton = document.getElementById("create-btn");
if (createButton) {
    // When the create button is clicked, send POST request to /api/articles
    createButton.addEventListener("click", (event) => {
        body = JSON.stringify({
            title: document.getElementById("title").value,
            content: document.getElementById("content").value,
        });
        function success() {
            alert("등록 완료되었습니다");
            location.replace("/articles");
        }
        function fail() {
            alert("등록 실패했습니다");
            location.replace("/articles");
        }

        httpRequest("POST", "/api/articles", body, success, fail);
    });
}
// Retrieve a cookie value by key
function getCookie(key) {
    var result = null;
    var cookie = document.cookie.split(":");
    cookie.some(function (item) {
        item = item.replace(" ", "");
        var dic = item.split("=");
        if (key === dic[0]) {
            result = dic[1];
            return true;
        }
    });
    return result;
}
// Send HTTP request with access token
function httpRequest(method, url, body, success, fail) {
    fetch(url, {
        method: method,
        headers: {
            // Attach access token from localStorage
            Authorization: "Bearer" + localStorage.getItem("access_token"),
            "Content-Type": "application/json",
        },
        body: body,
    }).then((response) => {
        // If request succeeds (200 OK or 201 Created)
        if (response.status === 200 || response.status === 201) {
            return success();
        }
        const refresh_token = getCookie("refresh_token");
        // If access token expired and refresh token exists
        if (response.status === 401 && refresh_token) {
            // Request new access token using refresh token
            fetch("/api/token", {
                method: "POST",
                headers: {
                    Authorization: "Bearer" + localStorage.getItem("access_token"),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    refreshToken: getCookie("refresh_token"),
                }),
            })
                .then((res) => {
                    if (res.ok) {
                        return res.json();
                    }
                })
                .then((result) => {
                    // Replace old access token with new one
                    localStorage.setItem("access_token", result.accessToken);
                    // Retry original request
                    httpRequest(method, url, body, success, fail);
                })
                .catch((error) => fail());
        } else {
            return fail();
        }
    });
}
// Delete article
const deleteButton = document.getElementById("delete-btn");

if (deleteButton) {
    deleteButton.addEventListener("click", (event) => {
        let id = document.getElementById("article-id").value;
        function success() {
            alert("삭제가 완료되었습니다");
            location.replace("/articles");
        }
        function fail() {
            alert("삭제 실패했습니다.");
            location.replace("/articles");
        }
        httpRequest("DELETE", "/api/articles/" + id, null, success, fail);
    });
}
// Update article
const modifyButton = document.getElementById("modify-btn");

if (modifyButton) {
    modifyButton.addEventListener("click", (event) => {
        let params = new URLSearchParams(location.search);
        let id = params.get("id");

        body = JSON.stringify({
            title: document.getElementById("title").value,
            content: document.getElementById("content").value,
        });
        function success() {
            alert("수정 완료하였습니다");
            location.replace("/articles/" +id);
        }
        function fail() {
            alert("수정 실패하였습니다");
            location.replace("/articles/"+id);
        }
        httpRequest("PUT", "/api/articles/" + id, body, success, fail);
    });
}
```

### Adding Authorization Logic for Update/Delete
To prevent unauthorized modification or deletion, verify that the authenticated user is the original author of the article.
- BlogService.java
Before updating or deleting an article, check whether the current user is the author.
```java
@RequiredArgsConstructor
@Service
public class BlogService {
    private final BlogRepository blogRepository;

    public void delete(long id) {
        Article article = blogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("not found : " + id));

        authorizeArticleAuthor(article);
        blogRepository.delete(article);
    }

    @Transactional
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("not found: " + id));

        authorizeArticleAuthor(article);
        article.update(request.getTitle(), request.getContent());

        return article;
    }
    // Verify that the current authenticated user is the article's author
    private static void authorizeArticleAuthor(Article article) {
        String userName = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!article.getAuthor().equals(userName)) {
            throw new IllegalArgumentException("not authorized");
        }
    }
}
```
