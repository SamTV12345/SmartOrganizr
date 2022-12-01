package de.smart.organizr.entities.interfaces;

public interface Author {
	/**
	 * Gets the auto generated id of the author
	 * @return the id
	 */
	int getId();

	/**
	 * Gets the name of the author
	 * @return the author
	 */
	String getName();

	/**
	 * Sets the name of the author
	 * @param name the name of the author
	 */
	void setName(String name);

	/**
	 * Gets extra information of the author
	 * @return the extra information
	 */
	String getExtraInformation();

	/**
	 * Sets the extra information of the author
	 * @param extraInformation the extra information of the author
	 */
	void setExtraInformation(String extraInformation);

	/**
	 * Gets the creator of the author
	 * @return the creator
	 */
	User getCreator();

	/**
	 * Sets the creator of the author
	 * @param creator the creator
	 */
	void setCreator(User creator);
}
