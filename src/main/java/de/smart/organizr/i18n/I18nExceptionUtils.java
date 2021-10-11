package de.smart.organizr.i18n;

import java.util.ResourceBundle;

public class I18nExceptionUtils {

	private static final ResourceBundle resourceBundle;
	
	private static final String I18N_BASENAME_EXCEPTIONS = "i18n.exceptions";
	private static final String WRONG_PASSWORD = "permission.wrong-password";
	private static final String UNKNOWN_USER = "user.unknown-user";
	private static final String USERNAME_ALREADY_REGISTERED = "user.username-already-taken";
	private static final String INVALID_PASSWORD = "password.invalid-password";
	private static final String PASSWORDS_NOT_EQUAL = "password.passwords-are-not-equal";
	private static final String AUTHOR_UNKNOWN = "author.author-unknown";

	static {
		resourceBundle = ResourceBundle.getBundle(I18N_BASENAME_EXCEPTIONS);
	}

	public static String getWrongPasswordException() {
		return resourceBundle.getString(WRONG_PASSWORD);
	}

	public static String getUserUnknown() {
		return resourceBundle.getString(UNKNOWN_USER);
	}

	public static String getUsernameAlreadyRegistered() {
		return resourceBundle.getString(USERNAME_ALREADY_REGISTERED);
	}
	

	public static String getPasswordIsInvalid() {
		return resourceBundle.getString(INVALID_PASSWORD);
	}

	public static String getPasswordsNotEqualException() {
		return resourceBundle.getString(PASSWORDS_NOT_EQUAL);
	}

	public static String getAuthorUnknown() {
		return resourceBundle.getString(AUTHOR_UNKNOWN);
	}
}
