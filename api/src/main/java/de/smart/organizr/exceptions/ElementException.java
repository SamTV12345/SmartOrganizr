package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

public final class ElementException extends RuntimeException {

	private ElementException(final String message){
		super(message.trim());
	}

	public static ElementException createElementNameMayNotBeEmptyException(){
		return new ElementException(I18nExceptionUtils.getElementMayNotBeEmpty());
	}

	public static ElementException createElementIdMayNotBeNegative() {
		return new ElementException(I18nExceptionUtils.getElementIdMayNotBeNegative());
	}
}
