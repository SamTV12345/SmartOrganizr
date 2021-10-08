package de.smart.organizr.view;

import javax.annotation.PostConstruct;

import de.smart.organizr.entities.UserEntity;
import de.smart.organizr.enums.Role;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.PasswordUtils;
import de.smart.organizr.services.interfaces.UserService;

/**
 * Klasse zum Verwalten des Benutzers
 * @author thomas
 *
 */
public class EditUserView {

	private final UserService userService;

	private UserEntity userEntity;
	
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
		userEntity = JsfUtils.getUserFromFlash();
		
		if(userEntity != null) {
			username = userEntity.getUserName();
			emailAddress = userEntity.getEmailAddress();
			role = userEntity.getRole();
			changePasswordNextLogin = userEntity.isPasswordResetRequired();
			//password = userEntity.getPassword();
		}
	}
	
	/**
	 * Methode zum Speichern des Benutzers
	 * @return Umlenken auf die Seite der Benutzerverwaltung
	 */
	public String saveUser() {
		if(userEntity != null) {
			userEntity.setUserName(username);
			userEntity.setEmailAddress(emailAddress);
			userEntity.setRole(role);
			
			if (!"".equals(password)) {
				userEntity.setPassword(password);
			}
			userEntity.setPasswordResetRequired(changePasswordNextLogin);
			
			userService.addUser(userEntity);
		} else {
			final UserEntity userEntity = new UserEntity(0, username, password, emailAddress, role);
			userService.addUser(userEntity);
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
