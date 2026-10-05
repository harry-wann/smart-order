package tw.ispan.smartorder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;

// northwind 不在 tw.ispan.smartorder 底下，要明確列出才會被掃描；
// 兩個 package 可能有同名類別（例如都有 CategoryService），bean 名稱改用完整路徑避免撞名
@SpringBootApplication(
        scanBasePackages = {"tw.ispan.smartorder", "tw.ispan.northwind"},
        nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class
)
public class SmartOrderApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartOrderApplication.class, args);
	}

}
