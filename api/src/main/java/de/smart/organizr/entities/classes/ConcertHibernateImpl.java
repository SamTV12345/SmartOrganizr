package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonIgnore;
import de.smart.organizr.entities.interfaces.User;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;


import java.util.Calendar;
import java.util.Set;

@Entity
@Table(name = "Concert")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@EqualsAndHashCode
public class ConcertHibernateImpl {
	@Id
	private String id;
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
