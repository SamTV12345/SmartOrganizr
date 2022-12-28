package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonBackReference;
import de.smart.organizr.entities.interfaces.Concert;
import de.smart.organizr.entities.interfaces.Note;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Target;


@Entity(name = "noteInConcert")
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(exclude = {"concertHibernateImpl"})
@Getter
@IdClass(NoteInConcertId.class)
public class NoteInConcert {
	@ManyToOne
	@JoinColumn(name = "note_id_fk")
	@Id
	private NoteHibernateImpl noteInConcert;
	@ManyToOne
	@JoinColumn(name = "concert_id_fk")
	@Id
	@JsonBackReference
	private ConcertHibernateImpl concertHibernateImpl;

	private int placeInConcert;
}
