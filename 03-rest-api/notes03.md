# REST API

## API & RESTful API
- **API(Application Programming Interface)**: An interface that delivers a client's request to the server and returns the server's response back to the client.
- **RESTful API**: REST (Representational State Transfer) is an architectural style where resources are identified by names and their state is transferred between client and server.
It focuses on proper URL design.
By looking at the URL and HTTP method, you should be able to understand what the request does.
- **How to Use REST API Properly**
1. Do not use verbs in the URL. Use nouns to represent resources.
2. Use HTTP methods to express actions (CRUD operations):
- POST → Create
- GET → Read
- PUT → Update
- DELETE → Delete

## Creating an Entity for Blog Development
- Article.java
```java
@Entity // Marks this class as a JPA entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Article {
    @Id // Specifies the primary key
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto-increment primary key
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "title", nullable = false) // Maps to a NOT NULL column named 'title'
    private String title;

    @Column(name = "content", nullable = false)
    private String content;

    @Builder // Enables builder pattern for object creation
    public Article(String title, String content) {
        this.title = title;
        this.content = content;
    }
}
```

- BlogRepository.java
```java
public interface BlogRepository extends JpaRepository<Article, Long> {
}
```
When extending JpaRepository, you must provide:
- The entity type (Article)
- The primary key type (Long)

## Implementing Blog Post Creation API
### Service Layer
- **DAO**: A Data Access Object responsible for interacting with the database.
- **DTO(data transfer object)**: An object used to transfer data between layers.
It does not contain business logic.

- AddArticleRequest.java
```java
@NoArgsConstructor // Default constructor
@AllArgsConstructor // Constructor with all fields
@Getter
public class AddArticleRequest {
    private String title;
    private String content;

    // Converts DTO to Entity using builder pattern
    public Article toEntity() { 
        return Article.builder().title(title).content(content).build();
    }
}
```
The toEntity() method converts the DTO into an Article entity using the Builder pattern.
This method is used when saving a new blog post to the database.

- BlogService.java
```java
@RequiredArgsConstructor // Generates constructor for final fields
@Service // Registers this class as a Spring bean
public class BlogService {

    private final BlogRepository blogRepository;

    // Saves a new blog post
    public Article save(AddArticleRequest request) {
    return blogRepository.save(request.toEntity());
    }
}
```
- @RequiredArgsConstructor is a Lombok annotation that generates a constructor for required fields.
- @Service registers the class as a Spring-managed bean.
- The save() method uses JpaRepository’s built-in save() method to persist the article into the database.

### Controller Layer Implementation
- BlogApiController.java
```java
@RequiredArgsConstructor
@RestController // Returns JSON data in HTTP response body
public class BlogApiController {

    private final BlogService blogService;

    // Handles POST requests to create a new article
    @PostMapping("/api/articles")
    public ResponseEntity<Article> addArticle(@RequestBody AddArticleRequest request) {
        Article savedArticle = blogService.save(request);

        // Returns 201 Created status with saved article
        return ResponseEntity.status(HttpStatus.CREATED).body(savedArticle);
    }
}
```
- @RestController automatically converts returned objects into JSON.
- @PostMapping("/api/articles") maps POST requests to /api/articles.
- @RequestBody binds the request body JSON to the DTO.
- ResponseEntity allows customization of HTTP status and response body.

### Testing the API
1. Enable H2 Console
```yml
  datasource:
    url: jdbc:h2:mem:testdb

  h2:
    console:
      enabled: true
```
2. Send a POST request with JSON body.
3. Verify the result in H2 console.


### Writing Test Code to Reduce Repetitive Work
- BlogApiControllerTest.java
```java
@SpringBootTest   // Loads test application context
@AutoConfigureMockMvc // Automatically configures MockMvc
class BlogApiControllerTest {
    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper; // Used for serialization/deserialization

    @Autowired
    private WebApplicationContext context;

    @Autowired
    BlogRepository blogRepository;

    @BeforeEach
    public void mockMvcSetUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        blogRepository.deleteAll();
    }

    @DisplayName("addArticle: successfully creates a blog post.")
    @Test
    public void addArticle() throws Exception {
        // given: create a request object for adding a blog post
        final String url = "/api/articles";
        final String title = "title";
        final String content = "content";
        final AddArticleRequest userRequest = new AddArticleRequest(title, content);

        final String requestBody = objectMapper.writeValueAsString(userRequest);

        // when: send a POST request to create an article (JSON content type + JSON body)
        ResultActions result = mockMvc.perform(post(url)
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(requestBody));

        // then: verify response status is 201 Created,
        // and verify one article is saved with matching title/content
        result.andExpect(status().isCreated());

        List<Article> articles = blogRepository.findAll();

        assertThat(articles.size()).isEqualTo(1); 
        assertThat(articles.get(0).getTitle()).isEqualTo(title);
        assertThat(articles.get(0).getContent()).isEqualTo(content);
    }
}
```
- **Serialization**: Converting Java objects into JSON format.
- **Deserialization**: Converting JSON data into Java objects.

## Implementing an API to Retrieve All Blog Posts
### Service
- BlogService.java
```java
public List<Article> findAll() { 
        return blogRepository.findAll();
    }
```

### Controller Code
- ArticleResponse.java
```java
@Getter
public class ArticleResponse {
    private final String title;
    private final String content;

    public ArticleResponse(Article article) {
        this.title = article.getTitle();
        this.content = article.getContent();
    }
}
```

- BlogApiController.java
```java
@GetMapping("/api/articles")
    public ResponseEntity<List<ArticleResponse>> findAllArticles() {
        List<ArticleResponse> articles = blogService.findAll()
        .stream()
        .map(ArticleResponse::new)
        .toList();
    return ResponseEntity.ok().body(articles);
    }
```
When a GET request comes to /api/articles, the controller:
1. Calls findAll() to retrieve all articles,
2. Converts each Article into an ArticleResponse,
3. Returns the list in the response body.

### Manual Test
- data.sql
```sql
INSERT INTO article (title, content) VALUES ('Title 1', 'Content 1');
INSERT INTO article (title, content) VALUES ('Title 2', 'Content 2');
INSERT INTO article (title, content) VALUES ('Title 3', 'Content 3');
```
Send a GET request to: http://localhost:8080/api/articles

### Test Code
- BlogApiControllerTest.java
```java
    @DisplayName("findAllArticles: successfully retrieves the list of blog posts.")
    @Test
    public void findAllArticles() throws Exception {
        // given: save an article
        final String url = "/api/articles";
        final String title = "title";
        final String content = "content";

        blogRepository.save(Article.builder().title(title).content(content).build());

        // when: call the GET API
        final ResultActions resultActions = mockMvc.perform(get(url).accept(MediaType.APPLICATION_JSON_VALUE));

        // then: verify 200 OK and verify the first item has matching title/content
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value(content))
                .andExpect(jsonPath("$[0].title").value(title));
    }
```

## Implementing an API to Retrieve a Single Blog Post by ID
### Service Method
- BlogService.java
```java
    public Article findById(long id) {
        return blogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("not found: " + id));
    }
```

### Controller Code
- BlogApiController.java
```java
    @GetMapping("/api/articles/{id}")
    // Extracts the value from the URL path ({id} is bound to the id parameter)
    public ResponseEntity<ArticleResponse> findArticle(@PathVariable long id) { 
        Article article = blogService.findById(id);

        return ResponseEntity.ok()
                .body(new ArticleResponse(article));
    }
```
@PathVariable is used to extract a variable from the URL path.

### Test Code
- BlogApiControllerTest.java
```java
    @DisplayName("findArticle: successfully retrieves a blog post by id.")
    @Test
    public void findArticle() throws Exception {
        // given: save an article
        final String url = "/api/articles/{id}";
        final String title = "title";
        final String content = "content";

        Article savedArticle = blogRepository.save(Article.builder().title(title).content(content).build());

        // when: call the GET API using the saved article's id
        final ResultActions resultActions = mockMvc.perform(get(url, savedArticle.getId()));

        // then: verify 200 OK and verify returned title/content match
        resultActions
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").value(content))
                .andExpect(jsonPath("$.title").value(title));
    }
```

## Implementing the Blog Post Delete API
### Service Method
- BlogService.java
```java
public void delete(long id) {
        blogRepository.deleteById(id);
    }
```

### Controller Method
- BlogApiController.java
```java
    @DeleteMapping("/api/articles/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable long id) {
        blogService.delete(id);

        return ResponseEntity.ok().build();
    }
```

### Manual Test
1. Set the method to DELETE, and send a request to: http://localhost:8080/api/articles/{id}
2. Set the method to GET, and request: http://localhost:8080/api/articles to confirm the post has been deleted.

### Test Code
- BlogApiControllerTest.java
```java
    @DisplayName("deleteArticle: successfully deletes a blog post.")
    @Test
    public void deleteArticle() throws Exception {
        // given: save a blog post
        final String url = "/api/articles/{id}";
        final String title = "title";
        final String content = "content";

        Article savedArticle = blogRepository.save(Article.builder().title(title).content(content).build());

        // when: call the delete API using the saved article id
        mockMvc.perform(delete(url, savedArticle.getId())).andExpect(status().isOk());

        // then: verify response is 200 OK and the repository is empty
        List<Article> articles = blogRepository.findAll();

        assertThat(articles).isEmpty();
    }
```

## Implementing the Blog Post Update API
### Service Method
- Article.java
```java
public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }
```

- UpdateArticleRequest.java
```java
@NoArgsConstructor
@AllArgsConstructor
@Getter
public class UpdateArticleRequest {
    private String title;
    private String content;
}
```

- BlogService.java
```java
    @Transactional // Transactional method
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id)
                .orElseThrow(()-> new IllegalArgumentException("not found: " + id));

        article.update(request.getTitle(), request.getContent());

        return article;
    }
```

### Controller Method
- BlogApiController.java
```java
    @PutMapping("/api/articles/{id}")
    public ResponseEntity<Article> updateArticle(@PathVariable long id,
                                                 @RequestBody UpdateArticleRequest request) {
        Article updatedArticle = blogService.update(id, request);

        return ResponseEntity.ok().body(updatedArticle);
    }
```

### Manual Test
Set the method to PUT, send JSON with updated values, and request the endpoint.

### Test Code
- BlogApiControllerTest.java
```java
    @DisplayName("updateArticle: successfully updates a blog post.")
    @Test
    public void updateArticle() throws Exception {
        // given: save a blog post and prepare an update request
        final String url = "/api/articles/{id}";
        final String title = "title";
        final String content = "content";

        Article savedArticle = blogRepository.save(Article.builder().title(title).content(content).build());

        final String newTitle = "new title";
        final String newContent = "new content";

        UpdateArticleRequest request = new UpdateArticleRequest(newTitle, newContent);

        // when: call the update API (PUT) with JSON request body
        ResultActions result = mockMvc.perform(put(url, savedArticle.getId())
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(objectMapper.writeValueAsString(request)));

        // then: verify 200 OK and confirm the article was updated in DB
        result.andExpect(status().isOk());

        Article article = blogRepository.findById(savedArticle.getId()).get();

        assertThat(article.getTitle()).isEqualTo(newTitle);
        assertThat(article.getContent()).isEqualTo(newContent);
    }
```