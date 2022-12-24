package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Note;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Target;


@Entity
@Table(name = "NoteInConcert")
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
@Getter
public class NoteInConcert {
	@Id
	private int noteId;
	@ManyToOne
	@Target(NoteHibernateImpl.class)
	private Note noteInConcert;
	private int placeInConcert;
}
