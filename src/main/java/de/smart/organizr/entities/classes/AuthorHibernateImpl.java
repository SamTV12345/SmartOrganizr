package de.smart.organizr.entities.classes;


import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;

import javax.persistence.*;

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
		this.id = id;
		this.name = name;
		this.extraInformation = extraInformation;
		this.creator = creator;
	}

	@Override
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	public int getId() {
		return id;
	}

	public void setId(final int id) {
		this.id = id;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(final String name) {
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
}
