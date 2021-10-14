package de.smart.organizr.dao.interfaces;


import de.smart.organizr.entities.classes.UserHibernateImpl;
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

	void removeUser(int userId);

	List<UserHibernateImpl> findAllUsers();

	Optional<UserHibernateImpl> findUserByUserName(String userName);

	Optional<User> findUserById(int userId);

	User saveUser(User userHibernateImpl);
}
