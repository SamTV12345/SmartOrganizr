package de.smart.organizr.dto;


import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class NotePatchDto {
	private int id;
	private String title;
	private int authorId;
	private int numberOfPages;
	private String description;
}
