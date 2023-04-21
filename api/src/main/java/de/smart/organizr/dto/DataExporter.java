package de.smart.organizr.dto;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Collection;

@Data
@AllArgsConstructor
public class DataExporter{
	private Collection<Author> authors;
	private Collection<Folder> folders;
	private Collection<Note>  notes;
}
