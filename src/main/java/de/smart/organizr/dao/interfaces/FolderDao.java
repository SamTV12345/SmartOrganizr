package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Folder;

import java.util.Set;

public interface FolderDao {
	Set<Folder> findAllFolders();

	Folder saveFolder(Folder folderToBeSaved);
}
