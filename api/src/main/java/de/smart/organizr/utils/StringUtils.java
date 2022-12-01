package de.smart.organizr.utils;

/**
 * Enthaelt einige Hilfsmethoden fuer die Arbeit mit Strings.
 * @author christopher
 *
 */
public class StringUtils {
	/**
	 * Prueft, ob ein String nicht leer ist. Dabei werden fuehrende und nachfolgende
	 * Leerzeichen entfernt. Ein String, der nur aus Leerzeichen besteht, wird
	 * folglich als leer gewertet. 
	 * @param aString Der zu pruefende String. 
	 * @return True, wenn aString nicht leer ist, sonst false.
	 */
	public static boolean isNotEmpty(final String aString) {
		if (aString == null) {
			return false;
		}
		return !aString.trim().isEmpty();
	}

	/**
	 * Prueft, ob ein String leer ist. Dabei werden fuehrende und nachfolgende
	 * Leerzeichen entfernt. Ein String, der nur aus Leerzeichen besteht, wird
	 * folglich als leer gewertet. 
	 * @param aString Der zu pruefende String. 
	 * @return True, wenn aString leer ist, sonst false.
	 */
	public static boolean isEmpty(final String aString) {
		if (aString == null) {
			return true;
		}
		return aString.trim().isEmpty();
	}

	public static boolean areStringsEqual(String string1, String string2) {
		return string1.equals(string2);
	}
}
