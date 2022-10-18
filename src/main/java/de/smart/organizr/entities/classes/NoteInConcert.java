package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Note;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Target;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

@Entity
@Table(name = "NoteInConcert")
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class NoteInConcert {
	@Id
	private int id;
	@ManyToOne
	@Target(NoteHibernateImpl.class)
	private Note noteInConcert;
	private int placeInConcert;
}
