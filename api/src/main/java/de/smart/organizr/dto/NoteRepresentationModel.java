package de.smart.organizr.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
	@JsonIgnoreProperties({"id", "creator","creationDate"})
	private Folder parent;
	@JsonIgnoreProperties({"id", "creator"})
	private Author author;
	private boolean pdfAvailable;
}
