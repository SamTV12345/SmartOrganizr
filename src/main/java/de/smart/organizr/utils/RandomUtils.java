package de.smart.organizr.utils;

import java.util.Random;

/**
 * Erzeugt Zufallswerte.
 * @author christopher
 *
 */
public class RandomUtils {
	/**
	 * Ein Random-Objekt, das fuer die Erzeugung der Zufallswerte zustaendig ist.
	 */
	private static final Random random;
	
	/**
	 * Initialisiert das Random-Objekt.
	 */
	static {
		random = new Random();
	}
	
	/**
	 * Erzeugt eine int-Zufallszahl von 0 bis zu einem Maximalwert.
	 * @param max Der Maximalwert.
	 * @return Die erzeugte Zufallszahl.
	 */
	public static int nextInt(final int max) {
		return random.nextInt(max);
	}
	
	/**
	 * Erzeugt eine long-Zufallszahl..
	 * @return Die erzeugte Zufallszahl.
	 */
	public static long nextLong() {
		return random.nextLong();
	}
}
