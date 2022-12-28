package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonIgnore;
import de.smart.organizr.entities.interfaces.Concert;
import de.smart.organizr.entities.interfaces.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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
@EqualsAndHashCode(exclude = "noteInConcerts")
@Setter
public class ConcertHibernateImpl implements Concert {
	@Id
	private String id;
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
	@OneToMany(mappedBy = "concertHibernateImpl")
	@OrderBy("placeInConcert ASC")
	private Set<NoteInConcert> noteInConcerts;
	@ManyToOne(targetEntity = UserHibernateImpl.class)
	@JsonIgnore
	@JoinColumn(name = "user_id_fk")
	private User creator;

	@Column(columnDefinition="TEXT")
	private String hints;
}
