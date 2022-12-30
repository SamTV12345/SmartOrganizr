package de.smart.organizr.utils;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.experimental.UtilityClass;


import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

@UtilityClass
public class BarCodeUtils {


	public static String generateQRCodeImage(final String barcodeText) throws Exception {
		final QRCodeWriter barcodeWriter = new QRCodeWriter();
		final BitMatrix bitMatrix =
				barcodeWriter.encode(barcodeText, BarcodeFormat.QR_CODE, 200, 200);

		return Base64.getEncoder().encodeToString(toByteArray(MatrixToImageWriter.toBufferedImage(bitMatrix), "png"));
	}

	public static byte[] toByteArray(final BufferedImage bi, final String format)
			throws IOException {

		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ImageIO.write(bi, format, baos);
		return baos.toByteArray();
	}
}