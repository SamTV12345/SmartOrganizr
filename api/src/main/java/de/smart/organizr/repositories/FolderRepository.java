package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface FolderRepository extends CrudRepository<FolderHibernateImpl, Integer> {
	@Query("SELECT f FROM FolderHibernateImpl f WHERE f.parent is null  AND f.creator.userId=:userId")
	Set<Folder> findAllParentFolders(final String userId);

	Set<Folder> findByCreator(User user);

	@Query("select f FROM FolderHibernateImpl f WHERE f.creator=:user AND f.name=:s")
	Optional<Folder> findFolderByUserAndName(User user, String s);

	@Modifying
	@Transactional
	@Query("DELETE FROM FolderHibernateImpl f WHERE f.id=:id")
	void deleteFolder(int id);

	@Query("SELECT e FROM ElementHibernateImpl as e WHERE e.creator.userId=:userId and e.parent.id=:number")
	Collection<Element> findAllChildren(String userId, int number);

	@Query("SELECT e FROM NoteHibernateImpl as e WHERE e.creator.userId=:userId and e.parent.id=:number ORDER BY e" +
			".title ASC")
	List<Note> findAllChildrenNotes(String userId, int number);

	@Query("SELECT e FROM ElementHibernateImpl as e WHERE e.creator.userId=:username AND e.id=:elementId")
	Optional<Element> findElementByIdAndUsername(int elementId, String username);


	@Query("SELECT f from FolderHibernateImpl f WHERE f.id=:folderId AND f.creator.userId=:username")
	Optional<Folder> findFolderByIdAndUsername(int folderId, String username);

	@Query("SELECT f FROM FolderHibernateImpl f WHERE (f.name LIKE CONCAT('%',:folderName,'%') OR f.description LIKE " +
			"CONCAT('%',:folderName,'%')) AND f.creator.userId=:userId")
	Page<Folder> findFolderByNameAndUser(String folderName, String userId, Pageable pageable);

	Page<Folder> findByCreator(User creator, Pageable pageable);
}
