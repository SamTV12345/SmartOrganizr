package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.validators.NoteValidator;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;
import org.springframework.context.annotation.Lazy;

import java.io.Serial;
import java.io.Serializable;
import java.sql.Blob;
import java.util.Calendar;

@Entity
@DiscriminatorValue("Note")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class NoteHibernateImpl extends ElementHibernateImpl implements Note, Serializable {
	@Serial
	private static final long serialVersionUID = 2460309513239727736L;
	private String title;
	private Author author;
	@Column(columnDefinition = "integer default 0")
	private int numberOfPages;

	public NoteHibernateImpl(final Calendar creationDate, final int id,
	                         final Folder parent, final String description,
	                         final User creator, final String title, final Author author, final int numberOfPages) {
		super(creationDate, id, "Element", parent, description, creator);
		setTitle(title);
		setNumberOfPages(numberOfPages);
		setAuthor(author);
	}



	@Override
	public String getTitle() {
		return title;
	}

	@Lazy
	@Lob
	@Column(columnDefinition="bytea")
	private Blob pdfContent;

	@Override
	public void setTitle(final String name) {
		NoteValidator.checkTitle(name);
		this.title = name.trim();
	}

	@Override
	@ManyToOne(targetEntity = AuthorHibernateImpl.class)
	@JoinColumn(name = "author_id_fk")
	public Author getAuthor() {
		return author;
	}

	@Override
	public void setAuthor(final Author author) {
		NoteValidator.checkAuthor(author);
		this.author = author;
	}

	@Override
	public String toString() {
		return "\nTitel:\t" +
				getTitle() +
				"\n" + "Beschreibung\t" +
				getDescription() +
				"\n" + "Enthaltende Ordner:\t" +
				getParent().getName() +
				getAuthor().toString();

	}
}
