package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.User;

import java.util.List;
import java.util.Optional;

public interface UserService {

	/**
	 * Adds a new user to the database.
	 * @param user The user that should be added.
	 * @return User that was added
	 */
	User addUser(User user);

	/**
	 * Deletes a user from the database
	 * @param userId The ID of the user to delete.
	 */
	void removeUser(String userId);

	/**
	 * Determines all users in the database and returns them as a list.
	 * @return A list with all users in the user table. An empty list,
	 * if the table is empty.
	 */
	List<User> findAllUsers();

	/**
	 * Determines a user based on a user name.
	 * @param userName User name used to find the user
	 * @return user, if it was found
	 */
	Optional<User> findUserByUserName(String userName);

	/**
	 * Findet einen Benutzer anhand der Benutzer-ID
	 * @param userId Benutzer-ID, die zum Ermitteln verwendent wird
	 * @return Benutzer, falls er gefunden wurde
	 */
	Optional<User> findUserById(String userId);

	/**
	 * Saves a user in the database
	 * @param userHibernateImpl User that should be saved
	 * @return user that was saved
	 */
	User saveUser(User userHibernateImpl);

	User updateUser(final String userId, final String username);

	void createIfNotExists(String name);
}
