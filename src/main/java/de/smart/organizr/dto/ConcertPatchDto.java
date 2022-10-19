package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Calendar;

@Getter
@AllArgsConstructor
public class ConcertPatchDto {
	private String title;
	private String description;
	private Calendar dueDate;
	private String location;
}
