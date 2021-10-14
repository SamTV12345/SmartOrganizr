package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.classes.UserHibernateImpl;
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
	void removeUser(int userId);

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
	Optional<User> findUserById(int userId);

	/**
	 * Changes the password of a user
	 * @param userId User ID to identify the user
	 * @param oldPassword Old password
	 * @param newPassword New password
	 * @return user
	 */
	User changePassword(int userId, String oldPassword, String newPassword);

	/**
	 * Saves a user in the database
	 * @param userHibernateImpl User that should be saved
	 * @return user that was saved
	 */
	User saveUser(User userHibernateImpl);


	/**
	 * Changes a required password
	 * @param userId User ID to identify the user
	 * @param newPassword NEW password
	 * @return user whose password was set
	 */
	User changePasswordRequired(long userId, String newPassword);

	/**
	 * Counts the admins
	 * @return Returns the number of admins
	 */
	int countAdmins();
}
