package de.smart.organizr.entities.interfaces;

import de.smart.organizr.enums.Role;

import javax.persistence.*;

public interface User {
	/**
	 * Gets the user id of the user
	 * @return the user id
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	int getUserId();

	/**
	 * Gets the username of the user
	 * @return the username
	 */
	String getUserName();

	/**
	 * Sets the username of the user
	 * @param userName the username
	 */
	void setUserName(String userName);

	/**
	 * Gets the password of the user
	 * @return the password
	 */
	String getPassword();

	/**
	 * Sets the password of the user
	 * @param password
	 */
	void setPassword(String password);

	/**
	 * Sets the role of the user
	 * @param role the role of the user
	 */
	void setRole(Role role);

	/**
	 * Gets the role of the user
	 * @return the role
	 */
	@Enumerated(EnumType.STRING)
	Role getRole();

	/**
	 * Gets the email address of the user
	 * @return the email addres
	 */
	String getEmailAddress();

	/**
	 * Sets the email address of the user
	 * @param emailAddress the email address
	 */
	void setEmailAddress(String emailAddress);

	/**
	 * Checks if a password reset is required
	 * @return boolean if change of the password is required
	 */
	boolean isPasswordResetRequired();

	/**
	 * Sets the user to be required to change the password
	 * @param passwordResetRequired if the user needs to change his password
	 */
	void setPasswordResetRequired(boolean passwordResetRequired);
}
