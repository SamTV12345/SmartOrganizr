package de.smart.organizr.i18n;


import java.text.MessageFormat;
import java.util.ResourceBundle;

public class I18nLabelsUtil {
	
	private static final ResourceBundle resourceBundle;
	
	private static final String EMAIL_ADRESS_CHANGED_TITLE = "email.email-address-changed-title";
	private static final String EMAIL_ADRESS_CHANGED_TEXT = "email.email-address-changed-text";
	private static final String EMAIL_RESET_PASSWORD_TITLE = "email.reset-password-title";
	private static final String EMAIL_RESET_PASSWORD_TEXT = "email.reset-password-text";
	private static final  String I18N_BASENAME_EXCEPTIONS = "i18n.labels";


	private static final String PDF_INVOICE_NO = "pdf.invoice-no";
	private static final String PDF_INVOICE_DATE = "pdf.invoice-date";
	private static final String PDF_INVOICE = "pdf.invoice";
	private static final String PDF_BILL_TO = "pdf.bill-to";
	private static final String PDF_DISH_ID = "pdf.dish-id";
	private static final String PDF_CATEGORY = "pdf.category";
	private static final String PDF_UNIT_PRICE = "pdf.unit-price";
	private static final String PDF_QUANTITY = "pdf.quantity";
	private static final String PDF_WARRANTY = "pdf.warranty";
	private static final String PDF_AMOUNT = "pdf.amount";
	private static final String PDF_WARRANTY_1 = "pdf.warranty-1";
	private static final String PDF_SUBTOTAL= "pdf.subtotal";
	private static final String PDF_DISCOUNT= "pdf.discount";
	private static final String PDF_TAX= "pdf.tax";
	private static final String PDF_TOTAL= "pdf.total";
	private static final String PDF_SERVICE= "pdf.service";
	private static final String PDF_DISH_NAME = "pdf.name";


	static {
		resourceBundle = ResourceBundle.getBundle(I18N_BASENAME_EXCEPTIONS);
	}

	public static String getEmailAdressChangedText() {
		return resourceBundle.getString(EMAIL_ADRESS_CHANGED_TEXT);
	}

	public static String getEmailTitle(final String oldEMail, final String newEMail) {
		final String messageTitle = resourceBundle.getString(EMAIL_ADRESS_CHANGED_TITLE);
		return MessageFormat.format(messageTitle, oldEMail, newEMail);
	}

	public static String getEmailResetPasswordText(final String password) {
		final String passwordResetText = resourceBundle.getString(EMAIL_RESET_PASSWORD_TEXT);
		return MessageFormat.format(passwordResetText, password);
	}

	public static String getEmailResetPasswordTitle() {
		return resourceBundle.getString(EMAIL_RESET_PASSWORD_TITLE);
	}


	public static String getPdfBillTo() {
		return resourceBundle.getString(PDF_BILL_TO);
	}

	public static String getPdfAmount() {
		return resourceBundle.getString(PDF_AMOUNT);
	}

	public static String getPdfCategory() {
		return resourceBundle.getString(PDF_CATEGORY);
	}

	public static String getPdfDishId() {
		return resourceBundle.getString(PDF_DISH_ID);
	}

	public static String getPdfDiscount() {
		return resourceBundle.getString(PDF_DISCOUNT);
	}

	public static String getPdfInvoiceDate() {
		return resourceBundle.getString(PDF_INVOICE_DATE);
	}

	public static String getPdfInvoice() {
		return resourceBundle.getString(PDF_INVOICE);
	}

	public static String getPdfInvoiceNo() {
		return resourceBundle.getString(PDF_INVOICE_NO);
	}

	public static String getPdfQuantity() {
		return resourceBundle.getString(PDF_QUANTITY);
	}

	public static String getPdfService() {
		return resourceBundle.getString(PDF_SERVICE);
	}

	public static String getPdfSubtotal() {
		return resourceBundle.getString(PDF_SUBTOTAL);
	}

	public static String getPdfTax() {
		return resourceBundle.getString(PDF_TAX);
	}

	public static String getPdfUnitPrice() {
		return resourceBundle.getString(PDF_UNIT_PRICE);
	}

	public static String getPdfTotal() {
		return resourceBundle.getString(PDF_TOTAL);
	}

	public static String getPdfWarranty() {
		return resourceBundle.getString(PDF_WARRANTY);
	}

	public static String getPdfWarranty1() {
		return resourceBundle.getString(PDF_WARRANTY_1);
	}

	public static String getPdfDishName() {
		return resourceBundle.getString(PDF_DISH_NAME);
	}
}
