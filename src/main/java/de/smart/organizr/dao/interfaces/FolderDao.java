package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;

import java.util.Optional;
import java.util.Set;

public interface FolderDao {
	/**
	 * Finds all folders created by the user
	 * @param creator the user
	 * @return a set of folders
	 */
	Set<Folder> findAllFolders(User creator);

	/**
	 * Saves/updates a folder
	 * @param folderToBeSaved The folder to be saved
	 * @return the updated/saved folder
	 */
	Folder saveFolder(Folder folderToBeSaved);

	/**
	 * Finds all parent folders (folders with parent == null) of a user
	 * @param userId the user id
	 * @return a set of folders
	 */
	Set<Folder> findAllParentFolders(final String userId);

	/**
	 * Finds a folder by id
	 * @param folderId the folder id
	 * @return an optional with the folder
	 */
	Optional<Folder> findById(int folderId);

	/**
	 * Finds a folder by user and name of the folder
	 * @param user the user
	 * @param s the folder name
	 * @return the optional folder
	 */
	Optional<Folder> findFolderByUserAndName(User user, String s);

	/**
	 * Deletes a folder
	 * @param folder the folder to be deleted
	 */
	void deleteFolder(Folder folder);
}
