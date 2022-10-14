package de.smart.organizr.dto;

import de.smart.organizr.entities.interfaces.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthorPatchDto {
	private String name;
	private String extraInformation;
	private User creator;
}
