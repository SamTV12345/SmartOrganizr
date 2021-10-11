package de.smart.organizr.i18n;


import java.util.ResourceBundle;

public class I18nLabelsUtil {
	
	private static final ResourceBundle resourceBundle;

	private static final  String I18N_BASENAME_EXCEPTIONS = "i18n.labels";



	static {
		resourceBundle = ResourceBundle.getBundle(I18N_BASENAME_EXCEPTIONS);
	}
}
