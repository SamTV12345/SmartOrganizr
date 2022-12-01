package de.smart.organizr.entities.classes;


import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.validators.AuthorValidator;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.Objects;

@Entity
@Table(name = "authors")
public class AuthorHibernateImpl implements Author {
	private int id;
	private String name;
	private String extraInformation;
	private User creator;

	public AuthorHibernateImpl(){

	}

	public AuthorHibernateImpl(final String name, final String extraInformation, final User creator) {
		this(0, name, extraInformation, creator);
	}

	public AuthorHibernateImpl(final int id, final String name, final String extraInformation,
	                           final User creator) {
		AuthorValidator.checkAuthorName(name);
		AuthorValidator.checkAuthorId(id);

		this.id = id;
		this.name = name;
		this.extraInformation = extraInformation;
		this.creator = creator;
	}

	@Override
	public boolean equals(final Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		final AuthorHibernateImpl that = (AuthorHibernateImpl) o;
		return id == that.id && Objects.equals(name, that.name) &&
				Objects.equals(extraInformation, that.extraInformation) &&
				Objects.equals(creator, that.creator);
	}

	@Override
	public int hashCode() {
		return Objects.hash(id, name, extraInformation, creator);
	}

	@Override
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	public int getId() {
		return id;
	}

	public void setId(final int id) {
		AuthorValidator.checkAuthorId(id);
		this.id = id;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(final String name) {
		AuthorValidator.checkAuthorName(name);
		this.name = name;
	}

	@Override
	public String getExtraInformation() {
		return extraInformation;
	}

	@Override
	public void setExtraInformation(final String explanation) {
		this.extraInformation = explanation;
	}

	@Override
	@ManyToOne(targetEntity = UserHibernateImpl.class)
	@JoinColumn(name = "user_id_fk")
	public User getCreator() {
		return creator;
	}

	@Override
	public void setCreator(final User creator) {
		this.creator = creator;
	}

	@Override
	public String toString() {
		return "\n\nAuthor: " + getName() + "\n" +
				"Ausführliche Beschreibung:\n" + getExtraInformation();
	}
}
