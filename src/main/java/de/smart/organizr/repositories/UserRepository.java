package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

/**
 * Repository für die Benutzer
 *
 */
public interface UserRepository extends CrudRepository<UserHibernateImpl, Integer> {

	/**
	 * Finden eines Benutzers anhand des Benutzernamens
	 * @param userName Benutzername
	 * @return Benutzer, wenn er gefunden wurde
	 */
	Optional<UserHibernateImpl> findByUserName(String userName);

	/**
	 * Finden eines Benutzers anhand der ID des Benutzers
	 * @param userId Benutzer-ID
	 * @return Benutzer, wenn er gefunden wurde
	 */
	@Query("SELECT u FROM UserHibernateImpl u WHERE u.userId=:userId")
	Optional<UserHibernateImpl> findByUserId(final int userId);
}
