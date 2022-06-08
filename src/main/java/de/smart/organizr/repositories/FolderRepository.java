package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
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
}
