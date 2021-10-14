package de.smart.organizr.view;

import java.util.Optional;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.utils.PasswordUtils;
import de.smart.organizr.services.interfaces.UserService;

public class ResetPasswordView {
	private String username;
	private final UserService userService;

	public ResetPasswordView(final UserService userService){
		this.userService = userService;
	}

	public String resetPassword(){
		final Optional<User> optionalUser =userService.findUserByUserName(username);

		if(optionalUser.isPresent()) {
			final User userHibernateImpl = optionalUser.get();
			final String password = PasswordUtils.generateAlphaNumericPassword();
			userService.changePassword(userHibernateImpl.getUserId(), userHibernateImpl.getPassword(), password);
			userHibernateImpl.setPasswordResetRequired(true);
			userService.saveUser(userHibernateImpl);
		}
		return "/login";
	}


	public String getUsername() {
		return username;
	}

	public void setUsername(final String username) {
		this.username = username;
	}
}
