package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

/**
 * Repository für die Benutzer
 *
 */
public interface UserRepository extends CrudRepository<UserHibernateImpl, String> {

	/**
	 * Finden eines Benutzers anhand des Benutzernamens
	 * @param userName Benutzername
	 * @return Benutzer, wenn er gefunden wurde
	 */
	Optional<UserHibernateImpl> findByUserId(String userName);
}
