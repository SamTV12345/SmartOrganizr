package de.smart.organizr.services.implementations;

import java.util.List;
import java.util.Optional;

import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.UserEntity;
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
	public UserEntity addUser(final UserEntity user) {
		PasswordValidator.checkPassword(user.getPassword());
		return userDao.addUser(user);
	}

	@Override
	public void removeUser(final long userId) {
		userDao.removeUser(userId);
	}

	@Override
	public List<UserEntity> findAllUsers() {
		return userDao.findAllUsers();
	}

	@Override
	public Optional<UserEntity> findUserByUserName(final String userName) {
		return userDao.findUserByUserName(userName);
	}

	@Override
	public Optional<UserEntity> findUserById(final int userId) {
		return userDao.findUserById(userId);
	}

	@Override
	public UserEntity changePassword(final long userId, final String oldPassword, final String newPassword) {
		PasswordValidator.checkPassword(newPassword);

		final Optional<UserEntity> optionalUser = userDao.findUserById(userId);
		if (optionalUser.isPresent()) {
			final UserEntity userEntity = optionalUser.get();
			final String oldPasswordHash = userEntity.getPassword();
			final boolean passwordMatches =
					oldPassword.equals(oldPasswordHash);

			if (!passwordMatches) {
				throw NoPermissionException.createWrongPasswordException();
			}
			userEntity.setPassword(newPassword);
			return userDao.saveUser(userEntity);
		}
		throw UserException.createUnknownUserException();
	}

	@Override
	public UserEntity saveUser(final UserEntity userEntity){
		final Optional<UserEntity> optionalUser = userDao.findUserById(userEntity.getUserId());
		if(optionalUser.isPresent()){
			userEntity.setPassword(optionalUser.get().getPassword());
			return userDao.saveUser(userEntity);
		}
		throw UserException.createUnknownUserException();
	}


	@Override
	public UserEntity changePasswordRequired(final long userId, final String newPassword){
		final Optional<UserEntity> user = findUserById(Math.toIntExact(userId));
		if (user.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		final UserEntity userEntity = user.get();
		final UserEntity savedUser = changePassword(user.get().getUserId(),userEntity.getPassword(),newPassword);
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
