package tw.ispan.smartorder.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.MetadataDirective;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import tw.ispan.smartorder.config.R2StorageConfiguration.R2Clients;
import tw.ispan.smartorder.config.R2StorageProperties;
import tw.ispan.smartorder.controller.ImageUploadController.CompleteResponse;
import tw.ispan.smartorder.controller.ImageUploadController.PresignRequest;
import tw.ispan.smartorder.controller.ImageUploadController.PresignResponse;

@Service
public class ImageUploadService {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");
    private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(10);
    private static final Duration UPLOAD_TICKET_TTL = Duration.ofHours(1);
    private static final String PENDING_PREFIX = "pending/";
    private static final String PUBLIC_PREFIX = "images/";

    private final R2StorageProperties properties;
    private final R2Clients r2Clients;
    private final ConcurrentMap<String, PendingUpload> pendingUploads = new ConcurrentHashMap<>();

    public ImageUploadService(R2StorageProperties properties, R2Clients r2Clients) {
        this.properties = properties;
        this.r2Clients = r2Clients;
    }

    public long maxUploadBytes() {
        return properties.maxUploadBytes();
    }

    public PresignResponse createUpload(PresignRequest request) {
        requireR2Configuration();
        String extension = EXTENSIONS.get(request.contentType());
        if (extension == null) {
            throw badRequest("只接受 JPEG、PNG 或 WebP 圖片");
        }
        if (request.size() <= 0 || request.size() > properties.maxUploadBytes()) {
            throw badRequest("圖片大小需大於 0，且不可超過 " + properties.maxUploadBytes() + " bytes");
        }

        PendingUpload pendingUpload;
        String uploadToken;
        if (request.uploadToken() == null || request.uploadToken().isBlank()) {
            removeExpiredTickets();
            uploadToken = UUID.randomUUID().toString();
            pendingUpload = new PendingUpload(
                    newObjectKey(PENDING_PREFIX, extension),
                    request.contentType(),
                    request.size(),
                    Instant.now().plus(UPLOAD_TICKET_TTL),
                    null,
                    null);
            pendingUploads.put(uploadToken, pendingUpload);
        } else {
            uploadToken = request.uploadToken();
            pendingUpload = findPendingUpload(uploadToken);
            if (!pendingUpload.contentType().equals(request.contentType())
                    || pendingUpload.declaredSize() != request.size()) {
                throw badRequest("重試資料與原上傳不一致，請重新選擇圖片");
            }
            if (pendingUpload.imageUrl() != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "這張圖片已完成上傳");
            }
        }

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(properties.stagingBucketName())
                .key(pendingUpload.pendingObjectKey())
                .contentType(request.contentType())
                .build();
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(UPLOAD_URL_TTL)
                .putObjectRequest(putObjectRequest)
                .build();

        String uploadUrl = r2Clients.presigner().presignPutObject(presignRequest).url().toString();
        return new PresignResponse(uploadUrl, uploadToken);
    }

    public CompleteResponse completeUpload(String uploadToken) {
        requireR2Configuration();
        PendingUpload pendingUpload = findPendingUpload(uploadToken);
        if (pendingUpload.imageUrl() != null) {
            return new CompleteResponse(pendingUpload.imageUrl(), pendingUpload.publicObjectKey());
        }

        try {
            var metadata = r2Clients.client().headObject(HeadObjectRequest.builder()
                    .bucket(properties.stagingBucketName())
                    .key(pendingUpload.pendingObjectKey())
                    .build());

            if (metadata.contentLength() == null
                    || metadata.contentLength() <= 0
                    || metadata.contentLength() > properties.maxUploadBytes()
                    || metadata.contentLength() != pendingUpload.declaredSize()
                    || metadata.contentType() == null
                    || !EXTENSIONS.containsKey(metadata.contentType())
                    || !pendingUpload.contentType().equals(metadata.contentType())) {
                r2Clients.client().deleteObject(DeleteObjectRequest.builder()
                        .bucket(properties.stagingBucketName())
                        .key(pendingUpload.pendingObjectKey())
                        .build());
                pendingUploads.remove(uploadToken);
                throw badRequest("上傳檔案大小或格式不符合限制，已移除該檔案");
            }

            String publicObjectKey = publicObjectKey(pendingUpload.pendingObjectKey());
            if (metadata.eTag() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "R2 未回傳圖片版本資訊，無法安全完成上傳");
            }
            r2Clients.client().copyObject(CopyObjectRequest.builder()
                    .copySource(properties.stagingBucketName() + "/" + pendingUpload.pendingObjectKey())
                    .copySourceIfMatch(metadata.eTag())
                    .bucket(properties.bucketName())
                    .key(publicObjectKey)
                    .metadataDirective(MetadataDirective.REPLACE)
                    .contentType(pendingUpload.contentType())
                    .build());
            r2Clients.client().deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.stagingBucketName())
                    .key(pendingUpload.pendingObjectKey())
                    .build());

            String imageUrl = properties.normalizedPublicBaseUrl() + "/" + publicObjectKey;
            pendingUploads.put(uploadToken, pendingUpload.completed(publicObjectKey, imageUrl));
            return new CompleteResponse(imageUrl, publicObjectKey);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "R2 尚未找到這張圖片，請重新上傳");
            }
            if (exception.statusCode() == 412) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "上傳中的圖片已變更，請重新確認圖片");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "無法確認 R2 圖片狀態");
        }
    }

    private String newObjectKey(String prefix, String extension) {
        return prefix + UUID.randomUUID() + "." + extension;
    }

    private String publicObjectKey(String pendingObjectKey) {
        return PUBLIC_PREFIX + pendingObjectKey.substring(PENDING_PREFIX.length());
    }

    private PendingUpload findPendingUpload(String uploadToken) {
        PendingUpload pendingUpload = pendingUploads.get(uploadToken);
        if (pendingUpload == null || !pendingUpload.expiresAt().isAfter(Instant.now())) {
            pendingUploads.remove(uploadToken);
            throw new ResponseStatusException(HttpStatus.GONE, "上傳暫存已過期，請重新選擇圖片");
        }
        return pendingUpload;
    }

    private void removeExpiredTickets() {
        Instant now = Instant.now();
        pendingUploads.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    private record PendingUpload(
            String pendingObjectKey,
            String contentType,
            long declaredSize,
            Instant expiresAt,
            String publicObjectKey,
            String imageUrl) {

        private PendingUpload completed(String objectKey, String url) {
            return new PendingUpload(pendingObjectKey, contentType, declaredSize, expiresAt, objectKey, url);
        }
    }

    private void requireR2Configuration() {
        if (!properties.isConfigured() || !r2Clients.isAvailable()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "R2 尚未設定，請在後端設定 R2 環境變數");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
