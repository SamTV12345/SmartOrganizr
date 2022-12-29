package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonBackReference;
import de.smart.organizr.entities.interfaces.Concert;
import de.smart.organizr.entities.interfaces.Note;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Target;


@Entity(name = "noteInConcert")
@AllArgsConstructor
@Table(name = "note_in_concert",uniqueConstraints = {@UniqueConstraint(columnNames = {"note_id_fk", "concert_id_fk",
		"place_in_concert"})})
@NoArgsConstructor
@EqualsAndHashCode(exclude = {"concertHibernateImpl"})
@Data
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

	@Column(name = "place_in_concert")
	private int placeInConcert;
}
