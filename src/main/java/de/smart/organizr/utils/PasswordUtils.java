package de.smart.organizr.utils;


import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import de.smart.organizr.constants.Constants;
import de.smart.organizr.validators.PasswordValidator;

public final class PasswordUtils {

	private static final SecureRandom random = new SecureRandom();

	private PasswordUtils(){
	}

	public static final String ALPHA_CAPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	public static final String ALPHA = "abcdefghijklmnopqrstuvwxyz";
	public static final String NUMERIC = "0123456789";
	public static final String SPECIAL_CHARACTERS ="!#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
	public static final String[] REQUIRED_CHAR_SETS = {ALPHA, ALPHA_CAPS, NUMERIC, SPECIAL_CHARACTERS};
	public static final int MIN_LENGTH = 8;

	/**
	 * Generiert ein alphanumerisches Passwort
	 * <p>
	 * Das Passwort erreicht die vorgegebene Länge und enthält jeweils mindestens:
	 * <ul>
	 * <li> einen Kleinbuchstaben
	 * <li> einen Großbuchstaben
	 * <li> eine Ziffer
	 * <li> ein Sonderzeichen
	 * </ul>
	 * @return das randomisierte Password
	 */
	public static String generateAlphaNumericPassword() {
		final int additionalLength = MIN_LENGTH;
		final String allChars = ALPHA_CAPS + ALPHA + NUMERIC + SPECIAL_CHARACTERS;
		final List<Character> chars = new ArrayList<>(additionalLength + REQUIRED_CHAR_SETS.length);
		
		for (String s: REQUIRED_CHAR_SETS) {
			final int index = random.nextInt(s.length());
			chars.add(s.charAt(index));
		}
		
		for (int i = 0; i < additionalLength; i++) {
			final int index = random.nextInt(allChars.length());
			chars.add(allChars.charAt(index));
		}
		
		Collections.shuffle(chars);
		final StringBuilder result = new StringBuilder();
		chars.forEach(result::append);
		
		return result.toString();
	}
    
	/**
	 * Prüft, ob {@code password} mindestens ein in {@code charSet} enthaltenes Zeichen enthält
	 * @param password Passwort, dessen Sicherheit geprüft werden soll
	 * @param charSet String, aus dessen Zeichensatz mindestens ein Zeichen enthalten sein muss
	 * @return true, falls {@code password} mindestens ein in {@code charSet} enthaltenes Zeichen enthält, sonst false
	 */
    public static boolean containsAtLeastOneOf(final String password, final String charSet) {
    	for (char c: charSet.toCharArray()) {
    		if (password.contains(String.valueOf(c))) {
    			return true;
    		}
    	}
    	return false;
    }

    /**
     * Gibt die Style-Klasse zurück, die anzeigt, ob das Passwort Klein- und Großbuchstaben enthält
     * @param password zu prüfendes Passwort
     * @return css-Style-Klasse
     */
	public static String calculateStyleClassAlphaAndAlphaCaps(final String password){
		if (containsAtLeastOneOf(password, ALPHA) && containsAtLeastOneOf(password, ALPHA_CAPS)){
			return Constants.getCSSCorrectClass();
		}
		
		return Constants.getCSSWrongClass();
	}

    /**
     * Gibt die Style-Klasse zurück, die anzeigt, ob das Passwort lang genug ist
     * @param password zu prüfendes Passwort
     * @return css-Style-Klasse
     */
	public static String calculateStyleClassLongEnough(final String password){
		if (PasswordValidator.validatePasswordLength(password)){
			return Constants.getCSSCorrectClass();
		}
		
		return Constants.getCSSWrongClass();
	}

    /**
     * Gibt die Style-Klasse zurück, die anzeigt, ob das Passwort Sonderzeichen enthält
     * @param password zu prüfendes Passwort
     * @return css-Style-Klasse
     */
	public static String calculateStyleClassSpecialCharacter(final String password) {
		if (containsAtLeastOneOf(password, SPECIAL_CHARACTERS)){
			return Constants.getCSSCorrectClass();
		}
		
		return Constants.getCSSWrongClass();
	}

    /**
     * Gibt die Style-Klasse zurück, die anzeigt, ob das Passwort Ziffern enthält
     * @param password zu prüfendes Passwort
     * @return css-Style-Klasse
     */
	public static String calculateStyleClassNumbers(final String password){
		if (containsAtLeastOneOf(password, NUMERIC)){
			return Constants.getCSSCorrectClass();
		}
		
		return Constants.getCSSWrongClass();
	}
}
