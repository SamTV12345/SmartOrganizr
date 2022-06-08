package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FolderService {
	/**
	 * Finds all folders by user id
	 * @param userId the user id
	 * @return a collection of folders
	 */
	List<Folder> findAllFolders(String userId);

	/**
	 * Finds a folder by id
	 * @param folderId the folder id
	 * @return an optional of the folder
	 */
	Optional<Folder> findFolderByID(int folderId);

	/**
	 * Saves a folder
	 * @param folder the folder to be saved
	 * @return the saved folder
	 */
	Folder saveFolder(Folder folder);

	/**
	 * Finds all parent folders by user id
	 * @param userId the user id
	 * @return a collection of folders
	 */
	Collection<Folder> findAllParentFolders(String userId);

	/**
	 * Finds folder by user and name
	 * @param user the user
	 * @param s the name
	 * @return an optional folder
	 */
	Optional<Folder> findFolderByUserAndName(User user, String s);

	/**
	 * Deletes a folder
	 * @param folder the folder to be deleted
	 */
	void deleteFolder(Folder folder);
}
