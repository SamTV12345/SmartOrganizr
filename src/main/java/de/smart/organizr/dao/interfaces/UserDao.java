package de.smart.organizr.dao.interfaces;


import de.smart.organizr.entities.UserEntity;

import java.util.List;
import java.util.Optional;

public interface UserDao {

	UserEntity addUser(UserEntity user);

	void removeUser(long userId);

	List<UserEntity> findAllUsers();

	Optional<UserEntity> findUserByUserName(String userName);

	Optional<UserEntity> findUserById(long userId);

	UserEntity saveUser(UserEntity userEntity);
}
