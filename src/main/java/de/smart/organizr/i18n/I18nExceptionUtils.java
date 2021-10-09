package de.smart.organizr.i18n;

import java.text.MessageFormat;
import java.util.ResourceBundle;

public final class I18nExceptionUtils {
	private static final ResourceBundle resourceBundle;
	
	private static final String I18N_BASENAME_EXCEPTIONS = "i18n.exceptions";
	private static final String WRONG_PASSWORD = "permission.wrong-password";
	private static final String UNKNOWN_USER = "user.unknown-user";
	private static final String INVALID_EMAIL = "user.invalid-email";
	private static final String INVALID_EMAIL_EXTENDED = "user.invalid-email-extended";
	private static final String USERNAME_ALREADY_REGISTERED = "user.username-already-taken";
	private static final String INVALID_PASSWORD = "password.invalid-password";
	private static final String PASSWORDS_NOT_EQUAL = "password.passwords-are-not-equal";
	private static final String ROOM_INVALID_BUILDING = "room.building.incorrect";
	private static final String ROOM_INVALID_FLOOR = "room.floor.incorrect";
	private static final String ROOM_INVALID_ROOM = "room.room.incorrect";
	private static final String ROOM_INCORRECT = "room.incorrect";
	private static final String ROOM_DIGIT_COUNT_INCORRECT ="room.digit-count.incorrect";
	private static final String NO_DISHES_SELECTED = "order.no-dishes-selected";
	private static final String REVIEW_ID_MAY_NOT_BE_NEGATIVE = "review.id-may-not-be-negative";
	private static final String REVIEW_HEADER_MAY_NOT_BE_EMPTY = "review.header-may-not-be-empty";
	private static final String REVIEW_EXPLANATION_MAY_NOT_BE_EMPTY = "review.explanation-may-not-be-empty";
	private static final String REVIEW_STARS_MAY_NOT_BE_NEGATIVE = "review.stars-may-not-be-empty";
	private static final String ORDERED_DISH_ID_MAY_NOT_BE_NEGATIVE = "ordered-dish.id-may-not-be-negative";
	private static final String ORDERED_DISH_QUANTITY_MAY_NOT_BE_NEGATIVE = "ordered-dish.quantity-may-not-be-negative";
	private static final String ORDER_ID_MAY_NOT_BE_NEGATIVE = "order.id-may-not-be-negative";
	private static final String ORDER_PRICE_MAY_NOT_BE_NEGATIVE = "order.price-may-not-be-negative";
	private static final String ORDER_STAR_RATING_MAY_NOT_BE_NEGATIVE = "order.star-rating-may-not-be-negative";
	private static final String AUTHOR_UNKNOWN = "author.author-unknown";

	static {
		resourceBundle = ResourceBundle.getBundle(I18N_BASENAME_EXCEPTIONS);
	}

	/**
	 * Default Konstruktor
	 */
	private I18nExceptionUtils() {

	}
	public static String getWrongPasswordException() {
		return resourceBundle.getString(WRONG_PASSWORD);
	}

	public static String getUserUnknown() {
		return resourceBundle.getString(UNKNOWN_USER);
	}

	public static String getInvalidEMail(){
		return resourceBundle.getString(INVALID_EMAIL);
	}

	public static String getInvalidEMailExtended(){
		return resourceBundle.getString(INVALID_EMAIL_EXTENDED);
	}
	
	public static String getRoomInvalidBuilding(final int min, final int max) {
		final String message = resourceBundle.getString(ROOM_INVALID_BUILDING);
		return MessageFormat.format(message, min, max);
	}
	
	public static String getRoomInvalidFloor(final int min, final int max) {
		final String message = resourceBundle.getString(ROOM_INVALID_FLOOR);
		return MessageFormat.format(message, min, max);
	}
	
	public static String getRoomInvalidRoom(final int min, final int max) {
		final String message = resourceBundle.getString(ROOM_INVALID_ROOM);
		return MessageFormat.format(message, min, max);
	}

	public static String getUsernameAlreadyRegistered() {
		return resourceBundle.getString(USERNAME_ALREADY_REGISTERED);
	}
	
	public static String getRoomIncorrect() {
		return resourceBundle.getString(ROOM_INCORRECT);
	}
	
	public static String getRoomDigitCountIncorrect() {
		return resourceBundle.getString(ROOM_DIGIT_COUNT_INCORRECT);
	}
	
	public static String getNoDishesSelected() {
		return resourceBundle.getString(NO_DISHES_SELECTED);
	}

	public static String getPasswordIsInvalid() {
		return resourceBundle.getString(INVALID_PASSWORD);
	}

	public static String getPasswordsNotEqualException() {
		return resourceBundle.getString(PASSWORDS_NOT_EQUAL);
	}
	
	public static String getReviewIdMayNotBeNegative() {
		return resourceBundle.getString(REVIEW_ID_MAY_NOT_BE_NEGATIVE);
	}

	public static String getReviewHeaderMayNotBeEmpty() {
		return  resourceBundle.getString(REVIEW_HEADER_MAY_NOT_BE_EMPTY);
	}

	public static String getReviewExplanationMayNotBeEmpty() {
		return resourceBundle.getString(REVIEW_EXPLANATION_MAY_NOT_BE_EMPTY);
	}

	public static String getReviewStarsMayNotBeNegative() {
		return resourceBundle.getString(REVIEW_STARS_MAY_NOT_BE_NEGATIVE);
	}

	public static String getOrderedDishIdMayNotBeNegative() {
		return resourceBundle.getString(ORDERED_DISH_ID_MAY_NOT_BE_NEGATIVE);
	}

	public static String getOrderedDishQuantityMayNotBeNegative() {
		return resourceBundle.getString(ORDERED_DISH_QUANTITY_MAY_NOT_BE_NEGATIVE);
	}

	public static String getOrderIdMayNotBeNegative() {
		return resourceBundle.getString(ORDER_ID_MAY_NOT_BE_NEGATIVE);
	}

	public static String getOrderPriceMayNotBeNegative() {
		return resourceBundle.getString(ORDER_PRICE_MAY_NOT_BE_NEGATIVE);
	}

	public static String getOrderStarRatingMayNotBeNegative() {
		return resourceBundle.getString(ORDER_STAR_RATING_MAY_NOT_BE_NEGATIVE);
	}

	public static String getAuthorUnknown() {
		return resourceBundle.getString(AUTHOR_UNKNOWN);
	}
}
