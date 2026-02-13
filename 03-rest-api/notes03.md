# REST API

## API와 RESTful API
- **API**: 클라이언트의 요청을 서버에 전달하고, 서버의 결과물을 클라이언트에게 돌려주는 역할
- **RESTful API**: REST(Representational State Transfer), 자원을 이름으로 구분해 자원의 상태를 주고받는 API 방식. URL의 설계 방식. 주소와 메서드만 보고 요청의 내용을 파악할 수 있다는 특징이 있음. 
- **REST API를 사용하는 방법**
1. URL에는 동사를 쓰지 말고, 자원(가져오는 데이터)을 표시해야 한다.
2. 동사는 HTTP 메서드(서버에 요청하는 방법(CRUD) - POST, GET, PUT, DELETE)로

## 블로그 개발을 위한 엔티티 구성하기
- Article.java
```java
@Entity // 엔티티로 지정
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Article {
    @Id // id 필드를 기본키로 지정
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 기본키를 자동으로 1씩 증가
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "title", nullable = false) // 'title'이라는 not null 칼럼과 매핑
    private String title;

    @Column(name = "content", nullable = false)
    private String content;

    @Builder // 빌더 패턴으로 객체 생성
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
JpaRepository 클래스를 상속받을 때 엔티티 Article과 엔티티의 PK 타입 Long을 인수로 넣는다.

## 블로그 글 작성을 위한 API 구현하기
### 서비스 메서드 코드 작성하기
- **DAO**: 데이터베이스와 연결되고 데이터를 조회하고 수정하는 데 사용되는 객체
- **DTO(data transfer object)**: 계층끼리 데이터를 교환하기 위해 사용하는 객체. 단순하게 데이터를 옮기기 위해 사용하는 전달자 역할을 하는 객체이기 때문에 별도의 비즈니스 로직을 포함하지 않는다.

- AddArticleRequest.java
```java
@NoArgsConstructor // 기본 생성자 추가
@AllArgsConstructor // 모든 필드 값을 파라미터로 받는 생성자 추가
@Getter
public class AddArticleRequest {
    private String title;
    private String content;

    public Article toEntity() { // 생성자를 사용해 객체 생성
        return Article.builder().title(title).content(content).build();
    }
}
```
toEntity()는 빌더 패턴을 사용해 DTO를 엔티티로 만들어주는 메서드. 이 메서드는 추후 블로그 글을 추가할 때 저장할 엔티티로 변환하는 용도로 사용.

- BlogService.java
```java
@RequiredArgsConstructor // final이 붙거나 @NotNull이 붙은 필드의 생성자 추가
@Service // 빈으로 등록
public class BlogService {

    private final BlogRepository blogRepository;

    // 블로그 글 추가 메서드
    public Article save(AddArticleRequest request) {
    return blogRepository.save(request.toEntity());
    }
}
```
@RequiredArgsContructor는 빈을 생성자로 생성하는 롬복에서 지원하는 애너테이션.
@Service 애너테이션은 해당 클래스를 빈으로 서블릿 컨테이너에 등록
save()메서드는 JpaRepository에서 지원하는 저장 메서드로 AddArticleRequest 클래스에 저장된 값들을 article 데이터베이스에 저장.

### 컨트롤러 메서드 코드 작성하기
- BlogApiController.java
```java
@RequiredArgsConstructor
@RestController // HTTP Response Body에 객체 데이터를 JSON 형식으로 반환하는 컨트롤러
public class BlogApiController {

    private final BlogService blogService;

    // HTTP 메서드가 POST일 때 전달받은 URL과 동일하면 메서드로 매핑
    @PostMapping("/api/articles")
    // @RequestBody로 요청 본문 값 매핑
    public ResponseEntity<Article> addArticle(@RequestBody AddArticleRequest request) {
        Article savedArticle = blogService.save(request);

        // 요청한 자원이 성공적으로 생성되었으며 저장된 블로그 글 정보를 응답 객체에 담아 전송
        return ResponseEntity.status(HttpStatus.CREATED).body(savedArticle);
    }
}
```

### API 실행 테스트하기 
1. H2 콘솔 활성화
```yml
  datasource:
    url: jdbc:h2:mem:testdb

  h2:
    console:
      enabled: true
```
2. JSON 으로 요청값 작성후 POST로 서버에 요청
3. 실행 결과 확인


### 반복 작업을 줄여 줄 테스트 코드 작성하기
- BlogApiControllerTest.java
```java
@SpringBootTest  // 테스트용 애플리케이션 컨텍스트
@AutoConfigureMockMvc // MockMvc 생성 및 자동 구성
class BlogApiControllerTest {
    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper; // 직렬화, 역직렬화를 위한 클래스

    @Autowired
    private WebApplicationContext context;

    @Autowired
    BlogRepository blogRepository;

    @BeforeEach // 테스트 실행 전 실행하는 메서드
    public void mockMvcSetUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        blogRepository.deleteAll();
    }

    @DisplayName("addArticle: 블로그 글 추가에 성공한다.")
    @Test
    public void addArticle() throws Exception {
        // given (블로그 글 추가에 필요한 요청 객체를 만듦)
        final String url = "/api/articles";
        final String title = "title";
        final String content = "content";
        final AddArticleRequest userRequest = new AddArticleRequest(title, content);

        // 객체 JSON으로 직렬화
        final String requestBody = objectMapper.writeValueAsString(userRequest);

        // when (블로그 글 추가 API에 요총 보냄. 이 때 요청 타입은 JSON, given 절에서 미리 만들어둔 객체를 요청 본문으로 함께 보냄)
        // 설정한 내용을 바탕으로 요청 전송
        ResultActions result = mockMvc.perform(post(url)
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(requestBody));

        // then (응답코드가 201 Created인지 확인, Blog 전체를 조회해 크기가 1인지 확인하고, 실제로 저장된 데이터와 요청값 비교)
        result.andExpect(status().isCreated());

        List<Article> articles = blogRepository.findAll();

        assertThat(articles.size()).isEqualTo(1); // 크기가 1인지 검증
        assertThat(articles.get(0).getTitle()).isEqualTo(title);
        assertThat(articles.get(0).getContent()).isEqualTo(content);
    }
}
```
- **직렬화**: 자바 시스템 내부에서 사용되는 객체를 외부에서 사용하도록 데이터를 변환하는 작업. (예를 들어 JSON형식으로 직렬화)
- **역직렬화**: 외부에서 사용하는 데이터를 자바의 객체 형태로 변환하는 작업. (JSON 형식의 값을 자바 객체에 맞게 변환)

## 블로그 글 목록 조회를 위한 API 구현하기
### 서비스 메서드 코드 작성하기
- BlogService.java
```java
public List<Article> findAll() { // article 테이블에 저장되어 있는 모든 데이터 조회
        return blogRepository.findAll();
    }
```

### 컨트롤러 메서드 코드 작성하기
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
/api/articles GET 요청이 오면 글 전체를 조회하는 findAll() 메서드를 호출한 다음 응답용 객체인 ArticleResponse로 파싱해 body에 담아 클라이언트에게 전송

### 실행 테스트하기
- data.sql
```sql
INSERT INTO article (title, content) VALUES ('제목 1', '내용 1');
INSERT INTO article (title, content) VALUES ('제목 2', '내용 2');
INSERT INTO article (title, content) VALUES ('제목 3', '내용 3');
```
GET메서드로, URL에 http://localhost:8080/api/articles 입력하여 요청

### 테스트 코드 작성하기
- BlogApiControllerTest.java
```java
    @DisplayName("findAllArticles: 블로그 글 목록 조회에 성공한다.")
    @Test
    public void findAllArticles() throws Exception {
        // given (블로그 글을 저장)
        final String url = "/api/articles";
        final String title = "title";
        final String content = "content";

        blogRepository.save(Article.builder().title(title).content(content).build());

        // when (목록 조회 API를 호출)
        final ResultActions resultActions = mockMvc.perform(get(url).accept(MediaType.APPLICATION_JSON_VALUE));

        // then (응답 코드가 200 OK이고, 반환받은 값 중에 0번째 요소의 content와 title이 저장된 값이 같은지 확인)
        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value(content))
                .andExpect(jsonPath("$[0].title").value(title));
    }
```

## 블로그 글 조회 API 구현하기
### 서비스 메서드 코드 작성하기
- BlogService.java
```java
    public Article findById(long id) {
        return blogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("not found: " + id));
    }
```

### 컨트롤러 메서드 코드 작성하기
- BlogApiController.java
```java
    @GetMapping("/api/articles/{id}")
    // URL 경로에서 값 추출 ({id}에 해당하는 값이 id로 들어옴)
    public ResponseEntity<ArticleResponse> findArticle(@PathVariable long id) { 
        Article article = blogService.findById(id);

        return ResponseEntity.ok()
                .body(new ArticleResponse(article));
    }
```
@PathVariable 애너테이션은 URL에서 값을 가져오는 애너테이션.

### 실행 테스트하기
### 테스트 코드 작성하기
- BlogApiControllerTest.java
```java
    @DisplayName("findArticle: 블로그 글 조회에 성공한다.")
    @Test
    public void findArticle() throws Exception {
        // given (블로그 글을 저장)
        final String url = "/api/articles/{id}";
        final String title = "title";
        final String content = "content";

        Article savedArticle = blogRepository.save(Article.builder().title(title).content(content).build());

        // when (저장한 블로그 글의 id값으로 API를 호출)
        final ResultActions resultActions = mockMvc.perform(get(url, savedArticle.getId()));

        // then (응답 코드가 200 OK이고, 반환받은 content와 title이 저장된 값과 같은지 확인)
        resultActions
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").value(content))
                .andExpect(jsonPath("$.title").value(title));
    }
```

## 블로그 글 삭제 API 구현하기
### 서비스 메서드 코드 작성하기
- BlogService.java
```java
public void delete(long id) {
        blogRepository.deleteById(id);
    }
```

### 컨트롤러 메서드 코드 작성하기
- BlogApiController.java
```java
    @DeleteMapping("/api/articles/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable long id) {
        blogService.delete(id);

        return ResponseEntity.ok().build();
    }
```

### 실행 테스트하기
1. DELETE로 메서드 설정, URL에 http://localhost:8080/api/articles/{id}입력 후 요청
2. GET으로 메서드 설정, http://localhost:8080/api/articles 로 요청해서 확인

### 테스트 코드 작성하기
- BlogApiControllerTest.java
```java
    @DisplayName("deleteArticle: 블로그 글 삭제에 성공한다.")
    @Test
    public void deleteArticle() throws Exception {
        // given (블로그 글을 저장)
        final String url = "/api/articles/{id}";
        final String title = "title";
        final String content = "content";

        Article savedArticle = blogRepository.save(Article.builder().title(title).content(content).build());

        // when (저장한 블로그 글의 id값으로 삭제 API 호출)
        mockMvc.perform(delete(url, savedArticle.getId())).andExpect(status().isOk());

        // then (응답 코드가 200 OK이고, 블로그 글 리스트 전체 조회해 조회한 배열 크기가 0인지 확인)
        List<Article> articles = blogRepository.findAll();

        assertThat(articles).isEmpty();
    }
```

## 블로그 글 수정 API 구현하기
### 서비스 메서드 코드 작성하기
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
    @Transactional // 트랜잭션 메서드
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id)
                .orElseThrow(()-> new IllegalArgumentException("not found: " + id));

        article.update(request.getTitle(), request.getContent());

        return article;
    }
```

### 컨트롤러 메서드 코드 작성하기
- BlogApiController.java
```java
    @PutMapping("/api/articles/{id}")
    public ResponseEntity<Article> updateArticle(@PathVariable long id,
                                                 @RequestBody UpdateArticleRequest request) {
        Article updatedArticle = blogService.update(id, request);

        return ResponseEntity.ok().body(updatedArticle);
    }
```

### 실행 테스트하기
메서드를 PUT으로 설정, JSON형식으로 수정 내용 입력 후 요청

### 테스트 코드 작성하기
- BlogApiControllerTest.java
```java
    @DisplayName("updateArticle: 블로그 글 수정에 성공한다.")
    @Test
    public void updateArticle() throws Exception {
        // given (블로그 글을 저장하고, 블로그 글 수정에 필요한 요청 객체를 만듦)
        final String url = "/api/articles/{id}";
        final String title = "title";
        final String content = "content";

        Article savedArticle = blogRepository.save(Article.builder().title(title).content(content).build());

        final String newTitle = "new title";
        final String newContent = "new content";

        UpdateArticleRequest request = new UpdateArticleRequest(newTitle, newContent);

        // when (UPDATE API로 수정 요청을 보낸다. 이 때 요청 타입은 JSON이며 given 절에서 미리 만들어둔 객체를 요청 본문으로 함께 보낸다)
        ResultActions result = mockMvc.perform(put(url, savedArticle.getId())
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(objectMapper.writeValueAsString(request)));

        // then (응답 코드가 200 OK인지 확인. 블로그 글 id로 조회한 후에 값이 수정되었는지 확인)
        result.andExpect(status().isOk());

        Article article = blogRepository.findById(savedArticle.getId()).get();

        assertThat(article.getTitle()).isEqualTo(newTitle);
        assertThat(article.getContent()).isEqualTo(newContent);
    }
```