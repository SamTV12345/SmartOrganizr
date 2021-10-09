package de.smart.organizr.dao.interfaces;


import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;

import java.util.List;
import java.util.Optional;

public interface UserDao {

	UserHibernateImpl addUser(UserHibernateImpl user);

	void removeUser(int userId);

	List<UserHibernateImpl> findAllUsers();

	Optional<UserHibernateImpl> findUserByUserName(String userName);

	Optional<User> findUserById(int userId);

	UserHibernateImpl saveUser(UserHibernateImpl userHibernateImpl);
}
