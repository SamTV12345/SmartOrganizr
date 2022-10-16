package de.smart.organizr.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.hateoas.RepresentationModel;

@AllArgsConstructor
@Getter
public class ElementRepresentationModel extends RepresentationModel<ElementRepresentationModel> {
	private int id;
	private String name;
	private String description;
}
