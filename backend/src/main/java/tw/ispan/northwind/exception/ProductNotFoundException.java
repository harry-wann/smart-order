package tw.ispan.northwind.exception;

// 原路徑 tw.ispan.smartorder.exception

public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException(Integer id) {
        super("找不到商品：" + id);
    }
}
