package tw.ispan.smartorder.config;

import java.net.URI;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(R2StorageProperties.class)
public class R2StorageConfiguration {

    @Bean
    R2Clients r2Clients(R2StorageProperties properties) {
        if (!properties.isConfigured()) {
            return new R2Clients(null, null);
        }

        URI endpoint = URI.create("https://" + properties.accountId() + ".r2.cloudflarestorage.com");
        StaticCredentialsProvider credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.accessKeyId(), properties.secretAccessKey()));

        S3Configuration s3Configuration = S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .chunkedEncodingEnabled(false)
                .build();

        S3Client client = S3Client.builder()
                .endpointOverride(endpoint)
                .credentialsProvider(credentials)
                .region(Region.of("auto"))
                .serviceConfiguration(s3Configuration)
                .build();

        S3Presigner presigner = S3Presigner.builder()
                .endpointOverride(endpoint)
                .credentialsProvider(credentials)
                .region(Region.of("auto"))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();

        return new R2Clients(client, presigner);
    }

    public record R2Clients(S3Client client, S3Presigner presigner) implements AutoCloseable {
        public boolean isAvailable() {
            return client != null && presigner != null;
        }

        @Override
        public void close() {
            if (client != null) client.close();
            if (presigner != null) presigner.close();
        }
    }
}
