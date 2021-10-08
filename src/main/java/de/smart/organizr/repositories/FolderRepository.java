package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.Collection;
import java.util.Optional;

public interface FolderRepository extends CrudRepository<FolderHibernateImpl, Integer> {
	@Query("SELECT f FROM FolderHibernateImpl f WHERE f.parent=NULL")
	Collection<Folder> findAllParentFolders();
}
