package de.smart.organizr.entities.classes;


import de.smart.organizr.entities.interfaces.Author;

import javax.persistence.*;

@Entity
@Table(name = "authors")
public class AuthorHibernateImpl implements Author {
	private int id;
	private String name;
	private String extraInformation;

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	public int getId() {
		return id;
	}

	public void setId(final int id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	public String getExtraInformation() {
		return extraInformation;
	}

	public void setExtraInformation(final String explanation) {
		this.extraInformation = explanation;
	}
}
