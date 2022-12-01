package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class NotePostDto {
	private final int parentId;
	private final String title;
	private final int authorId;
	private final String description;
	private final int numberOfPages;
}
