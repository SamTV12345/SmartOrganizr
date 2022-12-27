package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.NoteInConcert;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Calendar;
import java.util.Set;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ConcertDto {
	private String id;
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
	private Set<NoteInConcert> noteInConcerts;
}
