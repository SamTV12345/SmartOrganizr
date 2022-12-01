package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class FolderPatchDto {
	private int folderId;
	private String name;
	private String description;
}
