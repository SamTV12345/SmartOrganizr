package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Folder;

import java.util.Collection;
import java.util.Optional;

public interface FolderService {
	Collection<Folder> findAllFolders(int userId);

	Optional<Folder> findFolderByID(int folderId);

	Folder saveFolder(Folder folder);

	Collection<Folder> findAllParentFolders(int userId);
}