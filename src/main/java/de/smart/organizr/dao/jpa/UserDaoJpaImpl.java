package de.smart.organizr.dao.jpa;



import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.repositories.UserRepository;

import java.util.LinkedList;
import java.util.List;
import java.util.Optional;

/**
 * The UserDaoJpaImpl class takes care of every database action related to users
 */
public class UserDaoJpaImpl implements UserDao {

	private final UserRepository userRepository;
	
	public UserDaoJpaImpl(final UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	/**
	 * Adds a user to the database
	 * @param user the user to saved
	 * @return the saved user
	 */
	@Override
	public User addUser(final User user) {
		return userRepository.save((UserHibernateImpl) user);
	}

	/**
	 * The user to remove
	 * @param userId the user id to be removed
	 */
	@Override
	public void removeUser(final int userId) {
		userRepository.deleteById(userId);
	}

	/**
	 * Finds all contained users. Should only be executed by an admin
	 * @return a list of users
	 */
	@Override
	public List<User> findAllUsers() {
		final List<User> users = new LinkedList<>();
		userRepository.findAll().forEach(users::add);
		return users;
	}

	/**
	 * Finds a user by username
	 * @param userName the username
	 * @return an optional user
	 */
	@Override
	public Optional<User> findUserByUserName(final String userName) {
		final Optional<UserHibernateImpl> optionalUserHibernate = userRepository.findByUserName(userName);
		if(optionalUserHibernate.isEmpty()){
			return Optional.empty();
		}
		else{
			return Optional.of(optionalUserHibernate.get());
		}

	}

	/**
	 * Finds a user by id
	 * @param userId the userId
	 * @return an optional of the found user
	 */
	@Override
	public Optional<User> findUserById(final int userId) {
		final Optional<UserHibernateImpl> optionalUser = userRepository.findByUserId(userId);
		if(optionalUser.isEmpty()){
			return Optional.empty();
		}
		return Optional.of(optionalUser.get());
	}

	/**
	 * Saves/updates a user
	 * @param userHibernateImpl the user to be saved
	 * @return the savedUser
	 */
	@Override
	public UserHibernateImpl saveUser(final User userHibernateImpl) {
		return userRepository.save((UserHibernateImpl) userHibernateImpl);
	}

}
