package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;

import java.util.Collection;
import java.util.Set;

public interface FolderDao {
	Set<Folder> findAllFolders(User creator);

	Folder saveFolder(Folder folderToBeSaved);

	Collection<Folder> findAllParentFolders(final int userId);
}
