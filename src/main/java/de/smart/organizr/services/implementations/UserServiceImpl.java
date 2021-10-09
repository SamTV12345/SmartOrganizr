package de.smart.organizr.services.implementations;

import java.util.List;
import java.util.Optional;

import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;
import de.smart.organizr.exceptions.NoPermissionException;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.validators.PasswordValidator;
import de.smart.organizr.services.interfaces.UserService;


public class UserServiceImpl implements UserService {

	private final UserDao userDao;
	
	public UserServiceImpl(final UserDao userDao) {
		this.userDao = userDao;
	}

	@Override
	public User addUser(final User user) {
		PasswordValidator.checkPassword(user.getPassword());
		return userDao.addUser((UserHibernateImpl) user);
	}

	@Override
	public void removeUser(final int userId) {
		userDao.removeUser(userId);
	}

	@Override
	public List<UserHibernateImpl> findAllUsers() {
		return userDao.findAllUsers();
	}

	@Override
	public Optional<UserHibernateImpl> findUserByUserName(final String userName) {
		return userDao.findUserByUserName(userName);
	}

	@Override
	public Optional<User> findUserById(final int userId) {
		return userDao.findUserById(userId);
	}

	@Override
	public UserHibernateImpl changePassword(final int userId, final String oldPassword, final String newPassword) {
		PasswordValidator.checkPassword(newPassword);

		final Optional<User> optionalUser = userDao.findUserById(userId);
		if (optionalUser.isPresent()) {
			final User userHibernateImpl = optionalUser.get();
			final String oldPasswordHash = userHibernateImpl.getPassword();
			final boolean passwordMatches =
					oldPassword.equals(oldPasswordHash);

			if (!passwordMatches) {
				throw NoPermissionException.createWrongPasswordException();
			}
			userHibernateImpl.setPassword(newPassword);
			return userDao.saveUser((UserHibernateImpl) userHibernateImpl);
		}
		throw UserException.createUnknownUserException();
	}

	@Override
	public UserHibernateImpl saveUser(final User userHibernateImpl){
		final Optional<User> optionalUser = userDao.findUserById(userHibernateImpl.getUserId());
		if(optionalUser.isPresent()){
			userHibernateImpl.setPassword(optionalUser.get().getPassword());
			return userDao.saveUser((UserHibernateImpl) userHibernateImpl);
		}
		throw UserException.createUnknownUserException();
	}


	@Override
	public UserHibernateImpl changePasswordRequired(final long userId, final String newPassword){
		final Optional<User> user = findUserById(Math.toIntExact(userId));
		if (user.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		final User userHibernateImpl = user.get();
		final UserHibernateImpl
				savedUser = changePassword(user.get().getUserId(), userHibernateImpl.getPassword(),newPassword);
		savedUser.setPasswordResetRequired(false);
		return saveUser(savedUser);
	}

	@Override
	public int countAdmins() {
		return (int) findAllUsers().stream()
				.filter(u -> u.getRole() == Role.ADMIN)
				.count();
	}

}
