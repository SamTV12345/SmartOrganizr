package de.smart.organizr.constants;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;

import java.util.Calendar;

/**
 * Constants which are used by more than one class
 */
public final class Constants {

	private Constants(){
	}

	public static String getCSSCorrectClass(){
		return "evaluation-icon-correct";
	}

	public static String getCSSWrongClass(){
		return "evaluation-icon-wrong";
	}

	public static Folder DEFAULT_FOLDER = new FolderHibernateImpl("DEFAULT", Calendar.getInstance(), "DEFAULT",null);
}
