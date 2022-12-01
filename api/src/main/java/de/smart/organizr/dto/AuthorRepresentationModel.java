package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import org.springframework.hateoas.RepresentationModel;

@AllArgsConstructor
@Getter
@EqualsAndHashCode(callSuper = true)
public class AuthorRepresentationModel extends RepresentationModel<AuthorRepresentationModel> {
	private int id;
	private String name;
	private String extraInformation;
}
