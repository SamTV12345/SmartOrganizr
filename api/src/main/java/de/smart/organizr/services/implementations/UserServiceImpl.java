package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.services.interfaces.UserService;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;


public class UserServiceImpl implements UserService {

	private final UserDao userDao;
	
	public UserServiceImpl(final UserDao userDao) {
		this.userDao = userDao;
	}

	@Override
	public User addUser(final User user) {
		return userDao.addUser(user);
	}

	@Override
	public void removeUser(final String userId) {
		userDao.removeUser(userId);
	}

	@Override
	public List<User> findAllUsers() {
		return userDao.findAllUsers();
	}

	@Override
	public Optional<User> findUserByUserName(final String userName) {
		return userDao.findUserByUserName(userName);
	}

	@Override
	public Optional<User> findUserById(final String userId) {
		return userDao.findUserById(userId);
	}

	@Override
	public User saveUser(final User userHibernateImpl){
		final Optional<User> optionalUser = userDao.findUserById(userHibernateImpl.getUserId());
		if(optionalUser.isPresent()){
			return userDao.saveUser(userHibernateImpl);
		}
		throw UserException.createUnknownUserException();
	}

	@Transactional
	public User updateUser(final String userId, final String username){
		final User user = userDao.findUserById(userId).orElseThrow(()->new UserException("Not found"));
		if(user.getUsername() == null || !user.getUsername().equals(username)){
			user.setUsername(username);
		}
		return user;
	}

	@Override
	public void createIfNotExists(final String name) {
		final Optional<User> optionalUser = userDao.findUserById(name);
		if(optionalUser.isEmpty()){
			//Create user
			userDao.saveUser(new UserHibernateImpl(name, name, "saga", false));
		}

	}
}
