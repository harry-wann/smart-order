package tw.ispan.smartorder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;

import java.time.ZoneId;
import java.util.TimeZone;

// northwind 不在 tw.ispan.smartorder 底下，要明確列出才會被掃描；
// 兩個 package 可能有同名類別（例如都有 CategoryService），bean 名稱改用完整路徑避免撞名
@SpringBootApplication(
        scanBasePackages = {"tw.ispan.smartorder", "tw.ispan.northwind"},
        nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class
)
public class SmartOrderApplication {

	public static void main(String[] args) {
		// 店在台灣，時間一律用台北時間。程式裡很多地方直接用 LocalDateTime.now()，
		// 它取的是 JVM 的預設時區，而預設時區跟著電腦設定走：同學的電腦大多是台北，
		// 雲端主機、Docker 容器常常是 UTC，同一份程式存進去的時間就差 8 小時。
		// 所以在 Spring 啟動前先固定成 Asia/Taipei，不依賴機器設定。
		// 資料庫連線那邊也設成 +08:00（見 SmartOrderDataSourceConfig），程式寫的時間和 SQL 的 CURRENT_TIMESTAMP 才會一致
		TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of("Asia/Taipei")));
		SpringApplication.run(SmartOrderApplication.class, args);
	}

}
