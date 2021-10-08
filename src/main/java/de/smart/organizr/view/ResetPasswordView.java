package de.smart.organizr.view;

import java.util.Optional;

import de.smart.organizr.entities.UserEntity;
import de.smart.organizr.i18n.I18nLabelsUtil;
import de.smart.organizr.utils.PasswordUtils;
import de.smart.organizr.services.interfaces.UserService;

public class ResetPasswordView {
	private String username;
	private final UserService userService;

	public ResetPasswordView(final UserService userService){
		this.userService = userService;
	}

	public String resetPassword(){
		final Optional<UserEntity> optionalUser =userService.findUserByUserName(username);

		if(optionalUser.isPresent()) {
			final UserEntity userEntity = optionalUser.get();
			final String password = PasswordUtils.generateAlphaNumericPassword();
			userService.changePassword(userEntity.getUserId(), userEntity.getPassword(), password);
			userEntity.setPasswordResetRequired(true);
			userService.saveUser(userEntity);
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
