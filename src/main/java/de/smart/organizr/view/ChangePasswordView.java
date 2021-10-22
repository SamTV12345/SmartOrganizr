package de.smart.organizr.view;

import javax.annotation.PostConstruct;

import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.PasswordException;
import de.smart.organizr.services.interfaces.UserService;
import de.smart.organizr.utils.JsfUtils;
import org.apache.tomcat.JarScanFilter;

/**
 * Klasse zum Zurücksetzen/Ändern des Passwortes
 *
 */
public class ChangePasswordView {
	
	private final UserService userService;
	private final UserBean userBean;
	
	private String password;
	private String passwordRetype;
	
	private User user;
	
	/**
	 * Konstruktor für die ChangePasswordView
	 * @param userService Benutzer-Service
	 * @param userBean Benutzer-Bean
	 */
	public ChangePasswordView(final UserService userService, final UserBean userBean) {
		this.userService = userService;
		this.userBean = userBean;
	}
	
	@PostConstruct
	public void initialize() {
		user = userBean.getUser();
	}
	
	/**
	 * Methode zum Zurücksetzen/Ändern des Passwortes
	 * @return
	 */
	public String changePassword() {
		try {
			if (user != null) {
				if (password.equals(passwordRetype)) {
					user.setPassword(password);
					user.setPasswordResetRequired(false);
					userService.addUser(user);
					return "menu.jsf";
				}
			}
			return "changePassword.jsf";
		}
		catch (final PasswordException passwordException){
			JsfUtils.putErrorMessage(passwordException.getMessage());
		}
		return null;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(final String password) {
		this.password = password;
	}

	public String getPasswordRetype() {
		return passwordRetype;
	}

	public void setPasswordRetype(final String passwordRetype) {
		this.passwordRetype = passwordRetype;
	}

	public User getUser() {
		return user;
	}

	public UserService getUserService() {
		return userService;
	}
}
