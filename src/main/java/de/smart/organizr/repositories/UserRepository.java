package de.smart.organizr.repositories;

import de.smart.organizr.entities.UserEntity;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

/**
 * Repository für die Benutzer
 * @author thomas
 *
 */
public interface UserRepository extends CrudRepository<UserEntity, Long> {

	/**
	 * Finden eines Benutzers anhand des Benutzernamens
	 * @param userName Benutzername
	 * @return Benutzer, wenn er gefunden wurde
	 */
	Optional<UserEntity> findByUserName(String userName);

	/**
	 * Finden eines Benutzers anhand der ID des Benutzers
	 * @param userId Benutzer-ID
	 * @return Benutzer, wenn er gefunden wurde
	 */
	@Query("SELECT u FROM UserEntity u WHERE u.userId=:userId")
	Optional<UserEntity> findByUserId(final long userId);
}
