package de.smart.organizr.entities.classes;

import lombok.Data;

import java.io.Serializable;

@Data
public class NoteInConcertId implements Serializable {
	private int noteInConcert;
	private String concertHibernateImpl;
}
