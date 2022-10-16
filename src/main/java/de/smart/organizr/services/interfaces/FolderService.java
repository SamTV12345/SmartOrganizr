package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.FolderPatchDto;
import de.smart.organizr.dto.FolderPostDto;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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

	Folder saveFolderForUser(FolderPostDto folder, String userId);

	/**
	 * Finds all parent folders by user id
	 *
	 * @param userId the user id
	 * @return a collection of folders
	 */
	Collection<Folder> findAllParentFolders(String userId);

	Collection<Element> findChildren(String userId, int number);

	/**
	 * Finds folder by user and name
	 *
	 * @param user the user
	 * @param s    the name
	 * @return an optional folder
	 */
	Optional<Folder> findFolderByUserAndName(User user, String s);

	void moveElementToFolder(int from, int to, String username);

	/**
	 * Deletes a folder
	 * @param folder the folder to be deleted
	 */
	void deleteFolder(Folder folder);

	Folder updateFolder(FolderPatchDto folderPatchDto, User user);

	Page<Folder> findAllFoldersWithName(String folderName, User user, Pageable pageable);
}
