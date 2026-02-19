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
