package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.Set;

public interface AuthorRepository extends CrudRepository<AuthorHibernateImpl,Integer> {
	@Query("SELECT a FROM AuthorHibernateImpl a WHERE a.creator.userId=:userId")
	Set<Author> findAuthorsByCreator(final String userId);
}
