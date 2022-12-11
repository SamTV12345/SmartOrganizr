package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.NoteInConcert;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Calendar;
import java.util.Set;

@Getter
@AllArgsConstructor
public class ConcertPatchDto {
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
	private Set<NoteInConcert> noteInConcerts;
}
