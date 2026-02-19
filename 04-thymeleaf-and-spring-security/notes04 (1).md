# Thymeleaf

## What is Thymeleaf?
- **Thymeleaf**: A server-side template engine. It receives data from a Spring server and renders that data dynamically into HTML pages.
- **Model**: An object used to pass values to the HTML view. You don’t need to manually create a Model instance; simply declare it as a parameter in the controller method. The Model contains key-value pairs. The controller sets data into the Model, and the view retrieves data using the corresponding keys. The Model acts as a bridge between the controller and the view. 

### Adding Thymeleaf Dependency
```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'
}
```

## Implementing the Blog Article List View
### Creating a DTO to Transfer Data to the View
- ArticleListViewResponse.java
```java
@Getter
public class ArticleListViewResponse {
    private final Long id;
    private final String title;
    private final String content;

    public ArticleListViewResponse(Article article) {
        this.id = article.getId();
        this.title = article.getTitle();
        this.content = article.getContent();
    }
}
```
### Writing the Controller Method
Handles the GET request and returns a view containing the full list of blog articles.
- BlogViewController.java
```java
@RequiredArgsConstructor
@Controller
public class BlogViewController {
    private final BlogService blogService;

    @GetMapping("/articles")
    public String getArticles(Model model) {
        // Convert Article entities to view response DTOs
        List<ArticleListViewResponse> articles = blogService.findAll().stream()
                .map(ArticleListViewResponse::new)
                .toList();
        // Add the list to the model with key "articles"
        model.addAttribute("articles", articles);

        return "articleList"; // Return articleList.html
    }
}
```

### Creating and Testing the HTML View
The following HTML iterates over the list of blog articles passed through the Model and displays each one.
- articleList.html
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8">
    <title>블로그 글 목록</title>
    <link rel="stylesheet" href="http://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
</head>
<body>
<div class="p-5 mb-5 text-center bg-light">
    <h1 class="mb-3">My Blog</h1>
    <h4 class="mb-3">블로그에 오신 것을 환영합니다.</h4>
</div>
<div class="container">
    <button type="button" id="create-btn"
            th:onclick="|location.href='@{/new-article}'|"
            class="btn btn-secondary btn-sm mb-3">글 등록</button>
    <div class="row-6" th:each="item : ${articles}">
        <div class="card">
            <div class="card-header" th:text="${item.id}"></div>
        </div>
        <div class="card-body">
            <h5 class="card-title" th:text="${item.title}"></h5>
            <p class="card-text" th:text="${item.content}"></p>
            <a th:href="@{/articles/{id}(id=${item.id})}" class="btn btn-primary">보러 가기</a>
        </div>
    </div>
    <br>
</div>
<button type="button" class="btn btn-secondary" onclick="location.href='/logout'">로그아웃</button>
<script src="/js/article.js"></script>
</body>
</html>
```

## Implementing the Blog Article Detail View
### Adding Created and Updated Timestamps to the Entity
- Article.java
```java
@EntityListeners(AuditingEntityListener.class)
public class Article {
    @CreatedDate // Automatically set when the entity is created
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate // Automatically updated when the entity is modified
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```
To ensure timestamps are updated each time the application runs, modify the data.sql file as follows:
- data.sql
```sql
INSERT INTO article (title, content, created_at, updated_at) VALUES ('제목 1', '내용 1', NOW(), NOW());
INSERT INTO article (title, content, created_at, updated_at) VALUES ('제목 2', '내용 2', NOW(), NOW());
INSERT INTO article (title, content, created_at, updated_at) VALUES ('제목 3', '내용 3', NOW(), NOW());
```
- Add the following annotation in SpringBootDeveloperApplication.java:
```java
@EnableJpaAuditing // Enables automatic updating of created_at and updated_at
```

### Creating a DTO for the Article Detail View
- ArticleViewResponse.java
```java
@NoArgsConstructor
@Getter
public class ArticleViewResponse {
    private Long id;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private String author;

    public ArticleViewResponse(Article article) {
        this.id = article.getId();
        this.title = article.getTitle();
        this.content = article.getContent();
        this.createdAt = article.getCreatedAt();
        this.author = article.getAuthor();
    }
}
```
### Writing the Controller Method for Article Detail
- BlogViewController.java
```java
    @GetMapping("/articles/{id}")
    public String getArticle(@PathVariable Long id, Model model) {
        // Retrieve article by ID
        Article article = blogService.findById(id);
        // Add article to the model
        model.addAttribute("article", new ArticleViewResponse(article));

        return "article"; // Return article.html
    }
```

### Create the HTML View
- article.html
```html
<!DOCTYPE html>
<html xmlsn:th="http://www.thymeleaf.org" xmlns:xmlsn="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <title>블로그 글</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
</head>
<body>
<div class="p-5 mb-5 text-center bg-light">
    <h1 class="mb-3">My Blog</h1>
    <h4 class="mb-3">블로그에 오신 것을 환영합니다.</h4>
</div>
<div class="container mt-5">
    <div class="row">
        <div class="col-lg-8">
            <article>
                <input type="hidden" id="article-id" th:value="${article.id}">
                <header class="mb-4">
                    <h1 class="fw-bolder mb-1" th:text="${article.title}"></h1>
                    <div class="text-muted fst-italic mb-2" th:text="|Posted on
                    ${#temporals.format(article.createdAt, 'yyyy-mm-dd HH:mm')} By ${article.author}|"></div>
                </header>
                <section class="mb-5">
                    <p class="fs-5 mb-4" th:text="${article.content}"></p>
                </section>
                <button type="button" id="modify-btn"
                        th:onclick="|location.href='@{/new-article?id={articleId}(articleId=${article.id})}'|"
                        class="btn btn-primary btn-sm">수정</button>
                <button type="button" id="delete-btn" class="btn btn-secondary btn-sm">삭제</button>
            </article>
        </div>
    </div>
</div>
<script src="/js/token.js"></script>
<script src="/js/article.js"></script>
</body>
</html>
```

## Add Delete Feature
### Implement Delete Logic
- article.js
```js
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
```
This JavaScript finds the element whose id is delete-btn. When the button is clicked, it sends a DELETE request to the server (via httpRequest) to delete the corresponding article.

## Add Edit / Create Feature
### Create Controller Method for Edit/Create View
- BlogViewController.java
```java
    @GetMapping("/new-article")
    // Maps the "id" query parameter to the id variable (id may be absent)
    public String newArticle(@RequestParam(required = false) Long id, Model model) {
        if (id == null) { // Create mode (no id)
            model.addAttribute("article", new ArticleViewResponse());
        } else {  // Edit mode (id exists)
            Article article = blogService.findById(id);
            model.addAttribute("article", new ArticleViewResponse(article));
        }

        return "newArticle";
    }
```

### Create the Edit/Create View
- newArticle.html
```html
<!DOCTYPE html>
<html xmlsn:th="http://www.thymeleaf.org" xmlns:xmlsn="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <title>블로그 글</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
</head>
<body>
<div class="p-5 mb-5 text-center bg-light">
    <h1 class="mb-3">My Blog</h1>
    <h4 class="mb-3">블로그에 오신 것을 환영합니다.</h4>
</div>
<div class="container mt-5">
    <div class="row">
        <div class="col-lg-8">
            <article>
                <input type="hidden" id="article-id" th:value="${article.id}">
                <header class="mb-4">
                    <input type="text" class="form-control" placeholder="제목" id="title" th:value="${article.title}">
                </header>
                <section class="mb-5">
                    <textarea class="form-control h-25" rows="10" placeholder="내용" id="content" th:text="${article.content}"></textarea>
                </section>
                <button th:if="${article.id} != null" type="button" id="modify-btn" class="btn btn-primary btn-sm">수정</button>
                <button th:if="${article.id} == null" type="button" id="create-btn" class="btn btn-primary btn-sm">수정</button>
            </article>
        </div>
    </div>
</div>
<script src="/js/article.js"></script>
</body>
</html>
```
### Implement Update Logic
- article.js
```js
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

### IImplement Create Logic
- article.js
```js
// Element with id="create-btn"
const createButton = document.getElementById("create-btn");
// Send a create API request when a click event is detected
if (createButton) {
    createButton.addEventListener("click", (event) => {
        fetch("/api/articles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: document.getElementById("title").value,
                content: document.getElementById("content").value,
            }),
        }).then(() => {
            alert("등록 완료되었습니다.");
            location.replace("/articles");
        });
    });
}
```