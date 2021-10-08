package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import org.springframework.data.repository.CrudRepository;

public interface FolderRepository extends CrudRepository<FolderHibernateImpl, Integer> {
}
