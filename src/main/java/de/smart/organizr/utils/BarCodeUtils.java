package de.smart.organizr.utils;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;


import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class BarCodeUtils {
	private BarCodeUtils(){

	}

	public static BufferedImage generateQRCodeImage(final String barcodeText) throws Exception {
		final QRCodeWriter barcodeWriter = new QRCodeWriter();
		final BitMatrix bitMatrix =
				barcodeWriter.encode(barcodeText, BarcodeFormat.QR_CODE, 200, 200);

		return MatrixToImageWriter.toBufferedImage(bitMatrix);
	}

	// convert BufferedImage to byte[]
	public static byte[] toByteArray(final BufferedImage bi, final String format)
			throws IOException {

		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ImageIO.write(bi, format, baos);
		return baos.toByteArray();
	}

	public static byte[] generateQRCodeByteArray(final String barcodeText){
		try {
			final BufferedImage bufferedImage = generateQRCodeImage(barcodeText);
			return toByteArray(bufferedImage,"png");
		}
		catch (Exception e) {
			e.printStackTrace();
		}
		return new byte[]{};
	}
}
