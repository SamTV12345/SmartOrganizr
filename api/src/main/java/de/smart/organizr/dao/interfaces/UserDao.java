package de.smart.organizr.dao.interfaces;


import de.smart.organizr.entities.interfaces.User;

import java.util.List;
import java.util.Optional;

public interface UserDao {

	/**
	 * Adds a iser
	 * @param user
	 * @return
	 */
	User addUser(User user);

	void removeUser(String userId);

	List<User> findAllUsers();

	Optional<User> findUserByUserName(String userName);

	Optional<User> findUserById(String userId);

	User saveUser(User userHibernateImpl);
}
