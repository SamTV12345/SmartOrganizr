package de.smart.organizr.dto;

import de.smart.organizr.entities.interfaces.Folder;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import org.springframework.hateoas.RepresentationModel;

import java.util.Date;

@Getter
@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
public class FolderRepresentationalModel extends RepresentationModel<FolderRepresentationalModel> {
	private final Date creationDate;
	private Folder parent;
	private final String description;
	private int id;
	private String name;
	private int length;
}
