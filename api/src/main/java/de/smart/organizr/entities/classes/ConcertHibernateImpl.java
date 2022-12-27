package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonIgnore;
import de.smart.organizr.entities.interfaces.User;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import java.util.Calendar;
import java.util.Set;

@Entity
@Table(name = "Concert")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@EqualsAndHashCode
@Setter
public class ConcertHibernateImpl {
	@Id
	private String id;
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
	@ManyToMany
	@JoinTable(
			name = "notes_in_concert",
			joinColumns = { @JoinColumn(name = "concert_id_fk") },
			inverseJoinColumns = { @JoinColumn(name = "note_id_fk") }
	)
	private Set<NoteInConcert> noteInConcerts;
	@ManyToOne(targetEntity = UserHibernateImpl.class)
	@JsonIgnore
	@JoinColumn(name = "user_id_fk")
	private User creator;
}
