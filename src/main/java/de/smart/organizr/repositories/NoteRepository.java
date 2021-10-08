package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import org.springframework.data.repository.CrudRepository;

public interface NoteRepository extends CrudRepository<NoteHibernateImpl, Integer> {
}
