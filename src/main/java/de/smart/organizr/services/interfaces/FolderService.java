package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Folder;

import java.util.Collection;

public interface FolderService {
	Collection<Folder> findAllFolders(int userId);

	Folder saveFolder(Folder folder);

	Collection<Folder> findAllParentFolders(int userId);
}
