package de.smart.organizr.view;

import javax.annotation.PostConstruct;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.services.interfaces.UserService;

/**
 * Klasse zum Zurücksetzen/Ändern des Passwortes
 * @author thomas
 *
 */
public class ChangePasswordView {
	
	private final UserService userService;
	private final UserBean userBean;
	
	private String password;
	private String passwordRetype;
	
	private UserHibernateImpl userHibernateImpl;
	
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
		userHibernateImpl = userBean.getUser();
	}
	
	/**
	 * Methode zum Zurücksetzen/Ändern des Passwortes
	 * @return
	 */
	public String changePassword() {
		if(userHibernateImpl != null) {
			if(password.equals(passwordRetype)) {
				userHibernateImpl.setPassword(password);
				userHibernateImpl.setPasswordResetRequired(false);
				userService.addUser(userHibernateImpl);
				return "menu.jsf";
			}
		}
		return "changePassword.jsf";
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getPasswordRetype() {
		return passwordRetype;
	}

	public void setPasswordRetype(String passwordRetype) {
		this.passwordRetype = passwordRetype;
	}

	public UserHibernateImpl getUserEntity() {
		return userHibernateImpl;
	}

	public UserService getUserService() {
		return userService;
	}
}
