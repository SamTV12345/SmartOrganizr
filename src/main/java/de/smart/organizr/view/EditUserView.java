package de.smart.organizr.view;

import javax.annotation.PostConstruct;

import de.smart.organizr.constants.Constants;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.enums.Role;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.PasswordUtils;
import de.smart.organizr.services.interfaces.UserService;

/**
 * Klasse zum Verwalten des Benutzers
 *
 */
public class EditUserView {

	private final UserService userService;

	private UserHibernateImpl userHibernateImpl;
	
	private String username;
	private String emailAddress;
	private String password;
	private Role role;
	
	private boolean changePasswordNextLogin;
	
	/**
	 * Konstruktor für die EditUserView
	 * @param userService Benutzer-Service
	 */
	public EditUserView(final UserService userService) {
		this.userService = userService;
	}
	
	@PostConstruct
	public void initialize() {
		userHibernateImpl = JsfUtils.getUserFromFlash();
		
		if(userHibernateImpl != null) {
			username = userHibernateImpl.getUserName();
			emailAddress = userHibernateImpl.getEmailAddress();
			role = userHibernateImpl.getRole();
			changePasswordNextLogin = userHibernateImpl.isPasswordResetRequired();
			//password = userEntity.getPassword();
		}
	}
	
	/**
	 * Methode zum Speichern des Benutzers
	 * @return Umlenken auf die Seite der Benutzerverwaltung
	 */
	public String saveUser() {
		if(userHibernateImpl != null) {
			userHibernateImpl.setUserName(username);
			userHibernateImpl.setEmailAddress(emailAddress);
			userHibernateImpl.setRole(role);
			
			if (!"".equals(password)) {
				userHibernateImpl.setPassword(password);
			}
			userHibernateImpl.setPasswordResetRequired(changePasswordNextLogin);
			
			userService.addUser(userHibernateImpl);
		} else {
			final UserHibernateImpl userHibernateImpl = new UserHibernateImpl(0, username, password, emailAddress,
					role, Constants.DEFAULT_THEME, false );
			userService.addUser(userHibernateImpl);
		}
		return "manageUsers";
	}
	
	/**
	 * Methode zum Generieren eines neuen Passwortes
	 */
	public void generateNewPassword() {
		password = PasswordUtils.generateAlphaNumericPassword();
		changePasswordNextLogin = true;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(final String username) {
		this.username = username;
	}

	public String getEmailAddress() {
		return emailAddress;
	}

	public void setEmailAddress(final String emailAddress) {
		this.emailAddress = emailAddress;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(final String password) {
		this.password = password;
	}

	public boolean isChangePasswordNextLogin() {
		return changePasswordNextLogin;
	}

	public void setChangePasswordNextLogin(final boolean changePasswordNextLogin) {
		this.changePasswordNextLogin = changePasswordNextLogin;
	}

	public Role getRole() {
		return role;
	}

	public void setRole(final Role role) {
		this.role = role;
	}

	public UserService getUserService() {
		return userService;
	}
}
