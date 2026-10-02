package tw.ispan.smartorder.config

import org.springframework.boot.jpa.EntityManagerFactoryBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter

@Configuration
class JpaConfig {

    @Bean
    fun entityManagerFactoryBuilder(): EntityManagerFactoryBuilder {
        return EntityManagerFactoryBuilder(
            HibernateJpaVendorAdapter(),
            { emptyMap<String, Any>() },
            null
        )
    }
}