package de.smart.organizr.utils;

import java.io.File;
import java.text.DateFormat;
import java.util.Calendar;
import java.util.Locale;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.FontSelector;
import com.itextpdf.text.pdf.PdfPCell;

public final class PDFCreationUtils {
	private static final String invoiceFolder = "invoices";

	private PDFCreationUtils(){

	}

	public static void createInvoiceFolder(){
		final File dir =new File(invoiceFolder);
		if (!dir.exists()){
			dir.mkdir();
		}
	}

	public static String getPathOfInvoice(final long orderId){
		return invoiceFolder+"/"+orderId+".pdf";
	}

	public static String formatDate(final Calendar calendar, final Locale locale){
		final DateFormat df = DateFormat.getDateInstance(DateFormat.MEDIUM,locale);
		return df.format(calendar.getTime());
	}

	public static PdfPCell getBillHeaderCell(final String text) {
		final FontSelector fs = new FontSelector();
		final Font font = FontFactory.getFont(FontFactory.HELVETICA, 11);
		font.setColor(BaseColor.GRAY);
		fs.addFont(font);
		final Phrase phrase = fs.process(text);
		final PdfPCell cell = new PdfPCell (phrase);
		cell.setHorizontalAlignment (Element.ALIGN_CENTER);
		cell.setPadding (5.0f);
		return cell;
	}

	public static PdfPCell getBillRowCell(final String text) {
		final PdfPCell cell = new PdfPCell (new Paragraph(text));
		cell.setHorizontalAlignment (Element.ALIGN_CENTER);
		cell.setPadding (5.0f);
		cell.setBorderWidthBottom(0);
		cell.setBorderWidthTop(0);
		return cell;
	}

	public static PdfPCell getValidityCell(final String text) {
		final FontSelector fs = new FontSelector();
		final Font font = FontFactory.getFont(FontFactory.HELVETICA, 10);
		font.setColor(BaseColor.GRAY);
		fs.addFont(font);
		final Phrase phrase = fs.process(text);
		final PdfPCell cell = new PdfPCell (phrase);
		cell.setBorder(0);
		return cell;
	}

	public static PdfPCell getAccountsCell(final String text) {
		final FontSelector fs = new FontSelector();
		final Font font = FontFactory.getFont(FontFactory.HELVETICA, 10);
		fs.addFont(font);
		final Phrase phrase = fs.process(text);
		final PdfPCell cell = new PdfPCell (phrase);
		cell.setBorderWidthRight(0);
		cell.setBorderWidthTop(0);
		cell.setPadding (5.0f);
		return cell;
	}
	public static PdfPCell getAccountsCellR(final String text) {
		final FontSelector fs = new FontSelector();
		final Font font = FontFactory.getFont(FontFactory.HELVETICA, 10);
		fs.addFont(font);
		final Phrase phrase = fs.process(text);
		final PdfPCell cell = new PdfPCell (phrase);
		cell.setBorderWidthLeft(0);
		cell.setBorderWidthTop(0);
		cell.setHorizontalAlignment (Element.ALIGN_RIGHT);
		cell.setPadding (5.0f);
		cell.setPaddingRight(20.0f);
		return cell;
	}

	public static PdfPCell getdescCell(final String text) {
		final FontSelector fs = new FontSelector();
		final Font font = FontFactory.getFont(FontFactory.HELVETICA, 10);
		font.setColor(BaseColor.GRAY);
		fs.addFont(font);
		final Phrase phrase = fs.process(text);
		final PdfPCell cell = new PdfPCell (phrase);
		cell.setHorizontalAlignment (Element.ALIGN_CENTER);
		cell.setBorder(0);
		return cell;
	}

	public static PdfPCell getIRDCell(final String text) {
		final PdfPCell cell = new PdfPCell (new Paragraph (text));
		cell.setHorizontalAlignment (Element.ALIGN_CENTER);
		cell.setPadding (5.0f);
		cell.setBorderColor(BaseColor.LIGHT_GRAY);
		return cell;
	}

	public static PdfPCell getIRHCell(final String text, final int alignment) {
		final FontSelector fs = new FontSelector();
		final Font font = FontFactory.getFont(FontFactory.HELVETICA, 16);
		/*	font.setColor(BaseColor.GRAY);*/
		fs.addFont(font);
		final Phrase phrase = fs.process(text);
		final PdfPCell cell = new PdfPCell(phrase);
		cell.setPadding(5);
		cell.setHorizontalAlignment(alignment);
		cell.setBorder(Rectangle.NO_BORDER);
		return cell;
	}

	public static String formatPriceCorrectly(final double price){
		return "%.2f€".formatted(price);
	}
}
