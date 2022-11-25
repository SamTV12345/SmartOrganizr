package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.util.Calendar;

public interface Element {
	/**
	 * Gets the date of creation
	 * @return the date of creation
	 */
	Calendar getCreationDate();

	/**
	 * The id of the element (auto generated)
	 * @return the id
	 */
	int getId();

	/**
	 * The name of the element (Element if note, something user defined if folder)
	 * @return the name of the element
	 */
	String getName();

	/**
	 * Sets the name of the element
	 * @param name the name of the element
	 */
	void setName(String name);

	/**
	 * Gets the parent of the element. This can only be a folder.
	 * If NULL, then its a parent or also called top level folder
	 * @return the folder
	 */
	@ManyToOne(targetEntity = FolderHibernateImpl.class)
	@JoinColumn(name = "Parent")
	Folder getParent();

	/**
	 * Sets the parent folder for the current element. The element is then contained in the folder
	 * @param parent the future parent
	 */
	void setParent(Folder parent);

	/**
	 * Gets the description of the string
	 * @return the description
	 */
	String getDescription();

	/**
	 * Sets the description
	 * @param description the description
	 */
	void setDescription(String description);

	/**
	 * The creator. A creator has many elements. An element only belongs to one creator
	 * @return the creator of the element
	 */
	@ManyToOne(targetEntity = UserHibernateImpl.class)
	User getCreator();
}
