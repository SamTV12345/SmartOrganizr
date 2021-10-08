package de.smart.organizr.dao.jpa;



import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.UserEntity;
import de.smart.organizr.repositories.UserRepository;

import java.util.LinkedList;
import java.util.List;
import java.util.Optional;

public class UserDaoJpaImpl implements UserDao {

	private final UserRepository userRepository;
	
	public UserDaoJpaImpl(final UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public UserEntity addUser(final UserEntity user) {
		return userRepository.save(user);
	}

	@Override
	public void removeUser(final long userId) {
		userRepository.deleteById(userId);
	}

	@Override
	public List<UserEntity> findAllUsers() {
		final List<UserEntity> users = new LinkedList<>();
		userRepository.findAll().forEach(users::add);
		return users;
	}
	
	@Override
	public Optional<UserEntity> findUserByUserName(final String userName) {
		return userRepository.findByUserName(userName);
	}

	@Override
	public Optional<UserEntity> findUserById(final long userId) {
		return userRepository.findByUserId(userId);
	}

	@Override
	public UserEntity saveUser(final UserEntity userEntity) {
		return userRepository.save(userEntity);
	}

}
