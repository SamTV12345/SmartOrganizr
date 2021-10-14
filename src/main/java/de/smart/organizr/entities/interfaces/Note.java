package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;

import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;

public interface Note extends Element{
	/**
	 * Gets the title of the note
	 * @return the note title
	 */
	String getTitle();

	/**
	 * Sets the note title
	 * @param name the note title
	 */
	void setTitle(String name);

	/**
	 * Gets the author of the note. A note can only have one author. An author can have multiple notes.
	 * @return the author of the note
	 */
	@ManyToOne(targetEntity = AuthorHibernateImpl.class)
	@JoinColumn(name = "author_id_fk")
	Author getAuthor();

	/**
	 * Sets the author
	 * @param author the author
	 */
	void setAuthor(Author author);
}
