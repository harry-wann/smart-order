package tw.ispan.smartorder.exception;

public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException(Integer id) {
        super("找不到商品：" + id);
    }
}
