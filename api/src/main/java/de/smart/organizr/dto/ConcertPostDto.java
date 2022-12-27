package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.NoteInConcert;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.Calendar;
import java.util.Set;

@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
@Data
public class ConcertPostDto {
	@NotNull
	private String title;
	@NotNull
	private String description;
	private Calendar dueDate;
	@NotNull
	private String location;
	@NotNull
	private Set<NoteInConcert> noteInConcerts;
}
