package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.NoteInConcert;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.Calendar;
import java.util.Set;

@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class ConcertPostDto {
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
	private Set<NoteInConcert> noteInConcerts;
}
