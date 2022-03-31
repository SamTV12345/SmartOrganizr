package de.smart.organizr.entities.interfaces;

import de.smart.organizr.enums.Role;

import javax.persistence.*;

public interface User {
	/**
	 * Gets the user id of the user
	 * @return the user id
	 */
	int getUserId();

	/**
	 * Gets the selected theme
	 * @return the selected theme
	 */
	String getSelectedTheme();

	/**
	 * Sets the selected theme
	 * @param selectedTheme the selected theme
	 */
	void setSelectedTheme(String selectedTheme);

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

	/**
	 * If true, the sideBar is collapsed
	 * @return the sidebar status
	 */
	boolean getSideBarCollapsed();

	/**
	 * Sets the sidebar to be collapsed or expanded
	 * @param collapsed if it should be collapsed
	 */
	void setSideBarCollapsed(boolean collapsed);
}
