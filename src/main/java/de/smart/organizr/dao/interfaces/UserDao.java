package de.smart.organizr.dao.interfaces;


import de.smart.organizr.entities.classes.UserHibernateImpl;

import java.util.List;
import java.util.Optional;

public interface UserDao {

	UserHibernateImpl addUser(UserHibernateImpl user);

	void removeUser(long userId);

	List<UserHibernateImpl> findAllUsers();

	Optional<UserHibernateImpl> findUserByUserName(String userName);

	Optional<UserHibernateImpl> findUserById(long userId);

	UserHibernateImpl saveUser(UserHibernateImpl userHibernateImpl);
}
