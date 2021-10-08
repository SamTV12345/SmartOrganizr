package de.smart.organizr.validators;

import de.smart.organizr.exceptions.PasswordException;
import de.smart.organizr.utils.PasswordUtils;

public final class PasswordValidator {

    private PasswordValidator() {

    }

    /**
     * Prüft, ob ein Passwort den Sicherheitsanforderungen entspricht.
     * @param toValidate zu prüfendes Passwort
     * @return true, falls es den Sicherheitsanforderungen entspricht, ansonsten false
     * @see PasswordUtils
     */
    public static boolean validatePassword(final String toValidate) {
    	if (toValidate == null) {
    		return false;
    	}
    	
    	for (String s: PasswordUtils.REQUIRED_CHAR_SETS) {
    		if (!PasswordUtils.containsAtLeastOneOf(toValidate, s)) {
    			return false;
    		}
    	}
    	
        return validatePasswordLength(toValidate);
    }

    /**
     * Prüft, ob ein Passwort den Sicherheitsanforderungen entspricht.
     * @param toValidate zu prüfendes Passwort
     * @throws PasswordException falls das Passwort nicht den Sicherheitsanforderungen entspricht
     * @see PasswordUtils
     */
    public static void checkPassword(final String toValidate){
        if (!validatePassword(toValidate)) {
            throw PasswordException.createPasswordInvalidException();
        }
    }
    
    /**
     * Prüft, ob das Passwort lang genug ist.
     * @param toValidate zu prüfendes Passwort
     * @return true, falls das Passwort lang genug ist, sonst false
     * @see PasswordUtils
     */
    public static boolean validatePasswordLength(final String password) {
    	return password.length() >= PasswordUtils.MIN_LENGTH;
    }
}
