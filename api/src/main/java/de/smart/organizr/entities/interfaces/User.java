package de.smart.organizr.entities.interfaces;

public interface User {
	/**
	 * Gets the user id of the user
	 * @return the user id
	 */
	String getUserId();

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
	String getUsername();

	/**
	 * Sets the username of the user
	 * @param username the username
	 */
	void setUsername(String username);

	/**
	 * If true, the sideBar is collapsed
	 * @return the sidebar status
	 */
	boolean isSideBarCollapsed();

	/**
	 * Sets the sidebar to be collapsed or expanded
	 * @param collapsed if it should be collapsed
	 */
	void setSideBarCollapsed(boolean collapsed);
}
