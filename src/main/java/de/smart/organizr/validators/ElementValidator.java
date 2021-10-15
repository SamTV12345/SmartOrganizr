package de.smart.organizr.validators;

import de.smart.organizr.exceptions.ElementException;

public class ElementValidator {
	private ElementValidator(){

	}

	public static boolean validateElementName(final String name){
		return !name.isBlank();
	}

	public static boolean validateElementId(final int id){
		return id>=0;
	}

	public static void checkElementName(final String name){
		if(!validateElementName(name)){
			throw ElementException.createElementNameMayNotBeEmptyException();
		}
	}

	public static void checkElementId(final int id){
		if(!validateElementId(id)){
			throw ElementException.createElementIdMayNotBeNegative();
		}
	}
}
