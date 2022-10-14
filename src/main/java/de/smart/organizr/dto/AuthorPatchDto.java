package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthorPatchDto {
	private String name;
	private String extraInformation;
}
