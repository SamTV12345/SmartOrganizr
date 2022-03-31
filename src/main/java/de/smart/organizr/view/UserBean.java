package de.smart.organizr.view;

import java.util.Optional;

import javax.annotation.PostConstruct;
import javax.faces.context.FacesContext;
import javax.servlet.ServletContext;

import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;
import de.smart.organizr.enums.Version;
import org.springframework.security.core.context.SecurityContextHolder;

import de.smart.organizr.services.interfaces.UserService;


public class UserBean {

	private final UserService userService;
	private final ServletContext servletContext;
	private String localeCode;
	private Optional<User> optionalUser;
	private String locale;
	private Version version;
	private boolean sidebarCollapsed = false;
	private String theme;

	public UserBean(final UserService userService, final ServletContext servletContext) {
		this.userService = userService;
		this.servletContext = servletContext;
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
			final Optional<User> optionalUser = userService.findUserByUserName(username);

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

	public Version getVersion() {
		return version;
	}

	public void setVersion(final Version version) {
		this.version = version;
	}

	public void toggleVersion(){
		if (version == Version.OLD_VERSION){
			version = Version.NEW_VERSION;
		}
		else{
			version = Version.OLD_VERSION;
		}
	}

	public void toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	public String getSidebarClass() {
		return sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded";
	}

	public boolean isSidebarCollapsed() {
		return sidebarCollapsed;
	}

	public boolean isOldVersion(){
		if (version ==null) {
			return false;
		}
		return version == Version.OLD_VERSION;
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

	public String getTheme() {
		return theme;
	}

	public void setTheme(final String theme) {
		System.out.println(theme);
		this.theme = theme;
	}

	public void setTheme() {
		this.theme = "saga";
	}
}
