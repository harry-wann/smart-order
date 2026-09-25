package tw.ispan.smartorder.exception;

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(Integer id) {
        super("找不到分類：" + id);
    }
}
