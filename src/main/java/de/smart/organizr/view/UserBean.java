package de.smart.organizr.view;

import java.io.IOException;
import java.util.Optional;

import javax.annotation.PostConstruct;
import javax.faces.context.ExternalContext;
import javax.faces.context.FacesContext;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;
import de.smart.organizr.enums.Version;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;

import de.smart.organizr.services.interfaces.UserService;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


@Getter
@Setter
public class UserBean {

	private final UserService userService;
	private final ServletContext servletContext;
	private String localeCode;
	private Optional<User> optionalUser;
	private String locale;
	private Version version;
	@Value("${keycloak.realm}")
	private String realm;
	@Value("${keycloak.auth-server-url}")
	private String keyCloakURL;

	@Autowired
	private HttpServletRequest request;

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
		checkUserLoginStatus();
		optionalUser.orElseThrow().setSideBarCollapsed(!optionalUser.orElseThrow().isSideBarCollapsed());
	}

	public String getSidebarClass() {
		checkUserLoginStatus();
		return optionalUser.orElseThrow().isSideBarCollapsed() ? "sidebar-collapsed" : "sidebar-expanded";
	}

	public boolean isSidebarCollapsed() {
		checkUserLoginStatus();
		return optionalUser.orElseThrow().isSideBarCollapsed();
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
		checkUserLoginStatus();
		return optionalUser.orElseThrow().getSelectedTheme();
	}

	public void setTheme(final String theme) {
		checkUserLoginStatus();
		optionalUser.orElseThrow().setSelectedTheme(theme);
	}

	public void setSidebarCollapsed(final boolean sidebarCollapsed) {
		checkUserLoginStatus();
		optionalUser.orElseThrow().setSideBarCollapsed(sidebarCollapsed);
	}

	public void logOut() throws IOException, ServletException {
		userService.saveUser(getUser());
		logout();
	}

	public ExternalContext currentExternalContext() {
		if (FacesContext.getCurrentInstance() == null) {
			throw new RuntimeException("message here ");
		} else {
			return FacesContext.getCurrentInstance().getExternalContext();
		}
	}

	public void logout() throws IOException, ServletException {
		final HttpServletRequest request = (HttpServletRequest) currentExternalContext().getRequest();
		final ExternalContext externalContext = currentExternalContext();
		request.logout();
		externalContext.redirect(externalContext.getRequestContextPath());
	}
}
