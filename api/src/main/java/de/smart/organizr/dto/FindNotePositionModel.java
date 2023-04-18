package de.smart.organizr.dto;

import de.smart.organizr.entities.interfaces.Note;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FindNotePositionModel {
	private Note previousNote;
	private Note nextNote;
	private int positionInFolder;
}
