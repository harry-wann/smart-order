package tw.ispan.smartorder.exception;

public class OtpFailedException extends RuntimeException{
	public OtpFailedException(String message){
		super(message);
	}
}
