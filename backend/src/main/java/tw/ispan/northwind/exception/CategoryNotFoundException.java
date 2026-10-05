package tw.ispan.northwind.exception;

// 原路徑 tw.ispan.smartorder.exception

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(Integer id) {
        super("找不到分類：" + id);
    }
}
