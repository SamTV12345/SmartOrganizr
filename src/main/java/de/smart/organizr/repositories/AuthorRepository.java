package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;


public interface AuthorRepository extends CrudRepository<AuthorHibernateImpl,Integer> {
	@Query("SELECT a FROM AuthorHibernateImpl a WHERE a.creator.userId=:userId")
	Page<Author> findAllByCreator(final String userId, final Pageable pageable);
}
