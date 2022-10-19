package de.smart.organizr.dto;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.hateoas.RepresentationModel;

@Data
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class NoteRepresentationModel extends RepresentationModel<ElementRepresentationModel> {
	private int id;
	private String title;
	private String description;
	private Folder parent;
	private Author author;
}
