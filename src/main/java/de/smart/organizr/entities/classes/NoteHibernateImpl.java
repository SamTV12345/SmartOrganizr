package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Calendar;
import java.util.Objects;

@Entity
@DiscriminatorValue("Note")
public class NoteHibernateImpl extends ElementHibernateImpl implements Note, Serializable {
	private  String title;
	private  Author author;


	protected NoteHibernateImpl(){
	}

	public NoteHibernateImpl(final String title, final String description,
	                         final Author author, final User creator) {
		this(title,description,Calendar.getInstance(), author, creator);
	}

	public NoteHibernateImpl(final String title, final String description,final Calendar creationDate,
	                         final Author author, final User creator) {
		super("Element",creationDate, description, creator);
		setTitle(title);
		setAuthor(author);
	}

	public NoteHibernateImpl(final Calendar creationDate, final int id,
	                         final Folder parent, final String description,
	                         final User creator, final String title, final Author author) {
		super(creationDate, id, "Element", parent, description, creator);
		this.title = title;
		this.author = author;
	}

	@Override
	public boolean equals(final Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		if (!super.equals(o)) {
			return false;
		}
		final NoteHibernateImpl that = (NoteHibernateImpl) o;
		return Objects.equals(title, that.title) && Objects.equals(author, that.author);
	}

	@Override
	public int hashCode() {
		return Objects.hash(super.hashCode(), title, author);
	}

	@Override
	public String getTitle() {
		return title;
	}

	@Override
	public void setTitle(final String name) {
		this.title = name;
	}

	@Override
	@ManyToOne(targetEntity = AuthorHibernateImpl.class)
	@JoinColumn(name = "author_id_fk")
	public Author getAuthor() {
		return author;
	}

	@Override
	public void setAuthor(final Author author) {
		this.author = author;
	}
}
