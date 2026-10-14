package tw.ispan.smartorder.exception;

public class TableNoFoundException extends RuntimeException{
	public TableNoFoundException(String tableNo){
		super("找不到桌號：" + tableNo);
	}
}
