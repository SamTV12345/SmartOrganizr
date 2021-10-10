package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

public interface FolderRepository extends CrudRepository<FolderHibernateImpl, Integer> {
	@Query("SELECT f FROM FolderHibernateImpl f WHERE f.parent=NULL AND f.creator.userId=:userId")
	Collection<Folder> findAllParentFolders(final int userId);

	Set<Folder> findByCreator(User user);
}
