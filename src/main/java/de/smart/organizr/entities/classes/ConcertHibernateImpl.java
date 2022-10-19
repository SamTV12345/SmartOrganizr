package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonIgnore;
import de.smart.organizr.entities.interfaces.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.util.Calendar;
import java.util.Set;

@Entity
@Table(name = "Concert")
@NoArgsConstructor
@AllArgsConstructor
@Data
@EqualsAndHashCode
public class ConcertHibernateImpl {
	@Id
	private int id;
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
	@ManyToMany
	private Set<NoteInConcert> noteInConcerts;
	@ManyToOne(targetEntity = UserHibernateImpl.class)
	@JsonIgnore
	@JoinColumn(name = "user_id_fk")
	private User creator;
}
