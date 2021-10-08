package de.smart.organizr.services.implementations;

import java.util.List;
import java.util.Optional;

import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.classes.UserHibernateImpl;
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
	public UserHibernateImpl addUser(final UserHibernateImpl user) {
		PasswordValidator.checkPassword(user.getPassword());
		return userDao.addUser(user);
	}

	@Override
	public void removeUser(final long userId) {
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
	public Optional<UserHibernateImpl> findUserById(final int userId) {
		return userDao.findUserById(userId);
	}

	@Override
	public UserHibernateImpl changePassword(final long userId, final String oldPassword, final String newPassword) {
		PasswordValidator.checkPassword(newPassword);

		final Optional<UserHibernateImpl> optionalUser = userDao.findUserById(userId);
		if (optionalUser.isPresent()) {
			final UserHibernateImpl userHibernateImpl = optionalUser.get();
			final String oldPasswordHash = userHibernateImpl.getPassword();
			final boolean passwordMatches =
					oldPassword.equals(oldPasswordHash);

			if (!passwordMatches) {
				throw NoPermissionException.createWrongPasswordException();
			}
			userHibernateImpl.setPassword(newPassword);
			return userDao.saveUser(userHibernateImpl);
		}
		throw UserException.createUnknownUserException();
	}

	@Override
	public UserHibernateImpl saveUser(final UserHibernateImpl userHibernateImpl){
		final Optional<UserHibernateImpl> optionalUser = userDao.findUserById(userHibernateImpl.getUserId());
		if(optionalUser.isPresent()){
			userHibernateImpl.setPassword(optionalUser.get().getPassword());
			return userDao.saveUser(userHibernateImpl);
		}
		throw UserException.createUnknownUserException();
	}


	@Override
	public UserHibernateImpl changePasswordRequired(final long userId, final String newPassword){
		final Optional<UserHibernateImpl> user = findUserById(Math.toIntExact(userId));
		if (user.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		final UserHibernateImpl userHibernateImpl = user.get();
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
