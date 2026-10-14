package tw.ispan.smartorder.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.r2")
public record R2StorageProperties(
        String accountId,
        String accessKeyId,
        String secretAccessKey,
        String bucketName,
        String stagingBucketName,
        String publicBaseUrl,
        long maxUploadBytes) {

    public boolean isConfigured() {
        return hasText(accountId)
                && hasText(accessKeyId)
                && hasText(secretAccessKey)
                && hasText(bucketName)
                && hasText(stagingBucketName)
                && !bucketName.equals(stagingBucketName)
                && hasText(publicBaseUrl);
    }

    public String normalizedPublicBaseUrl() {
        return publicBaseUrl == null ? "" : publicBaseUrl.replaceAll("/+$", "");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
