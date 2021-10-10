package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;

import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;

public interface Note extends Element{
	String getTitle();

	void setTitle(String name);

	@ManyToOne(targetEntity = AuthorHibernateImpl.class)
	@JoinColumn(name = "author_id_fk")
	Author getAuthor();

	void setAuthor(Author author);
}
