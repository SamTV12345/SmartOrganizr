package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class FolderPostDto {
	private final String name;
	private final String description;
	private final int parentId;
}
