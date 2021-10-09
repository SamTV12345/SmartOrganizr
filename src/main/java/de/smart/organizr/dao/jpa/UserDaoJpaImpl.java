package de.smart.organizr.dao.jpa;



import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
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
	public UserHibernateImpl addUser(final UserHibernateImpl user) {
		return userRepository.save(user);
	}

	@Override
	public void removeUser(final int userId) {
		userRepository.deleteById(userId);
	}

	@Override
	public List<UserHibernateImpl> findAllUsers() {
		final List<UserHibernateImpl> users = new LinkedList<>();
		userRepository.findAll().forEach(users::add);
		return users;
	}
	
	@Override
	public Optional<UserHibernateImpl> findUserByUserName(final String userName) {
		return userRepository.findByUserName(userName);
	}

	@Override
	public Optional<User> findUserById(final int userId) {
		final Optional<UserHibernateImpl> optionalUser = userRepository.findByUserId(userId);
		if(optionalUser.isEmpty()){
			return Optional.empty();
		}
		return Optional.of(optionalUser.get());
	}

	@Override
	public UserHibernateImpl saveUser(final UserHibernateImpl userHibernateImpl) {
		return userRepository.save(userHibernateImpl);
	}

}
