package de.smart.organizr.view;

import java.util.Optional;

import javax.annotation.PostConstruct;
import javax.faces.context.FacesContext;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;
import org.springframework.security.core.context.SecurityContextHolder;

import de.smart.organizr.services.interfaces.UserService;


public class UserBean {

	private final UserService userService;
	
	private String localeCode;
	private Optional<User> optionalUser;
	private String locale;

	public UserBean(final UserService userService) {
		this.userService = userService;
	}

	@PostConstruct
	public void initialize() {
		localeCode = FacesContext.getCurrentInstance().getExternalContext().getRequestLocale().getLanguage();
		optionalUser = Optional.empty();
	}
	
	public String getLocaleCode() {
		return localeCode;
	}
	
	public void setLocaleCode(final String localeCode) {
		this.localeCode = localeCode;
	}
	
	/**
	 * Überprüft, ob zwischenzeitlich ein Benutzer angemeldet wurde.
	 * 
	 * Wenn es eine Anmeldung gab, wird diese in den Optional übertragen. Eine Abmeldung ist nicht erforderlich,
	 * weil beim Abmelden die Session automatisch beendet wird.
	 */
	private void checkUserLoginStatus() {
		if (optionalUser.isPresent()) {
			return;
		}

		final String username = SecurityContextHolder.getContext().getAuthentication().getName();

		if (username != null) {
			final Optional<UserHibernateImpl> optionalUser = userService.findUserByUserName(username);

			optionalUser.ifPresent(user -> {
				this.optionalUser = Optional.of(user);
			});
		}
	}
	
	public User getUser() {
		checkUserLoginStatus();
		return optionalUser.get();
	}
	
	public boolean isLoggedIn() {
		checkUserLoginStatus();
		return optionalUser.isPresent();
	}

	public boolean isPasswordChangeRequired(){
		return optionalUser.get().isPasswordResetRequired();
	}
	
	public boolean isAdmin() {
		checkUserLoginStatus();
		return optionalUser.get().getRole() == Role.ADMIN;
	}

	public void setOptionalUser(final User savedUser) {
		this.optionalUser = Optional.of(savedUser);
	}

	public String getLocale() {
		return locale;
	}

	public void setLocale(final String locale) {
		this.locale = locale;
	}
}
