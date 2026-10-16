package tw.ispan.smartorder.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.repository.DiningTableRepository;

// S-08 桌位 QR code：桌上貼的是固定的碼，掃了打開 {顧客端網址}/order/checkin/{桌號}
@Service
public class QrCodeService {

    private static final int SIZE = 400; // 圖片邊長（px），印出來夠清楚

    @Autowired
    private DiningTableRepository diningTables;

    // application.properties 的 app.customer-base-url（沒設定就是 http://localhost:5173）
    @Value("${app.customer-base-url}")
    private String customerBaseUrl;

    // 這張桌的 QR code 要放的網址
    public String checkInUrl(Long tableId) {
        DiningTableEntity table = diningTables.findById(tableId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到桌位"));
        // 設定值結尾如果多打了 /，先拿掉，避免變成 //order
        String base = customerBaseUrl.endsWith("/")
                ? customerBaseUrl.substring(0, customerBaseUrl.length() - 1)
                : customerBaseUrl;
        return base + "/order/checkin/" + table.getTableNo();
    }

    // 把網址畫成 PNG 圖片
    public byte[] tablePng(Long tableId) {
        String url = checkInUrl(tableId);
        try {
            // 容錯等級 M：QR code 被弄髒、刮到一小塊還掃得出來（貼在餐桌上很容易沾到湯）
            Map<EncodeHintType, Object> hints = Map.of(
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                    EncodeHintType.MARGIN, 2);
            BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, SIZE, SIZE, hints);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("QR code 產生失敗", e);
        }
    }
}