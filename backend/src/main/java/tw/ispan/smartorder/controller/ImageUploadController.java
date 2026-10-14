package tw.ispan.smartorder.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import tw.ispan.smartorder.service.ImageUploadService;

@RestController
@RequestMapping("/api/uploads")
public class ImageUploadController {

    private final ImageUploadService imageUploadService;

    public ImageUploadController(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    @GetMapping("/config")
    public UploadConfigResponse config() {
        return new UploadConfigResponse(imageUploadService.maxUploadBytes());
    }

    @PostMapping("/presign")
    public PresignResponse presign(@Valid @RequestBody PresignRequest request) {
        return imageUploadService.createUpload(request);
    }

    @PostMapping("/complete")
    public CompleteResponse complete(@Valid @RequestBody CompleteRequest request) {
        return imageUploadService.completeUpload(request.uploadToken());
    }

    public record PresignRequest(
            @NotBlank String contentType,
            @Positive long size,
            String uploadToken) {
    }

    public record CompleteRequest(@NotBlank String uploadToken) {
    }

    public record PresignResponse(String uploadUrl, String uploadToken) {
    }

    public record CompleteResponse(String imageUrl, String objectKey) {
    }

    public record UploadConfigResponse(long maxUploadBytes) {
    }
}
