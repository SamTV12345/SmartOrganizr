package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Note;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Calendar;

@Entity
@DiscriminatorValue("Note")
public class NoteHibernateImpl extends ElementHibernateImpl implements Note, Serializable {
	private  String title;
	private  Author author;


	protected NoteHibernateImpl(){
	}

	public NoteHibernateImpl(final String title, final String description,
	                         final Author author) {
		this(title,description,Calendar.getInstance(), author);
	}

	public NoteHibernateImpl(final String title, final String description,final Calendar creationDate,
	                         final Author author) {
		super("Element",creationDate, description);
		setTitle(title);
		setAuthor(author);
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(final String name) {
		this.title = name;
	}

	@ManyToOne(targetEntity = AuthorHibernateImpl.class)
	@JoinColumn(name = "author_id_fk")
	public Author getAuthor() {
		return author;
	}

	public void setAuthor(final Author author) {
		this.author = author;
	}
}
