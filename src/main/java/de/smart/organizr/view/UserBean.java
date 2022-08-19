package de.smart.organizr.view;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Version;
import de.smart.organizr.services.interfaces.UserService;
import lombok.Getter;
import org.keycloak.KeycloakPrincipal;
import org.keycloak.KeycloakSecurityContext;
import org.keycloak.representations.AccessToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.annotation.PostConstruct;
import javax.faces.context.ExternalContext;
import javax.faces.context.FacesContext;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Optional;


@Getter
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
    private boolean admin;
    private boolean initialized = false;


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
     * <p>
     * Wenn es eine Anmeldung gab, wird diese in den Optional übertragen. Eine Abmeldung ist nicht erforderlich,
     * weil beim Abmelden die Session automatisch beendet wird.
     */
    private synchronized void checkUserLoginStatus() {
        if (optionalUser.isPresent()) {
            return;
        }

        final String userId = SecurityContextHolder.getContext().getAuthentication().getName();

        if (userId != null) {
            final Optional<User> optionalUser = userService.findUserByUserName(userId);

            optionalUser.ifPresent(user -> this.optionalUser = Optional.of(user));
            if(!initialized && optionalUser.isPresent()) {
                admin = initAdmin();
                userService.updateUser(userId, extractUsernameFromSecurityContext());
                initialized = true;
            }
           if(optionalUser.isEmpty()) {
               userService.addUser(new UserHibernateImpl(userId, extractUsernameFromSecurityContext(), "saga", false));
           }
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

    public Version getVersion() {
        return version;
    }

    public void setVersion(final Version version) {
        this.version = version;
    }

    public void toggleVersion() {
        if (version == Version.OLD_VERSION) {
            version = Version.NEW_VERSION;
        } else {
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

    public boolean isOldVersion() {
        if (version == null) {
            return false;
        }
        return version == Version.OLD_VERSION;
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
        userService.saveUser(optionalUser.get());
        final HttpServletRequest request = (HttpServletRequest) currentExternalContext().getRequest();
        final ExternalContext externalContext = currentExternalContext();
        request.logout();
        externalContext.redirect(externalContext.getRequestContextPath());
    }


    public String getUsername() {
        if(optionalUser.isEmpty()){
            return null;
        }
        return optionalUser.get().getUsername();
    }

    public String getAccountConsoleLink(){
        if(keyCloakURL.trim().endsWith("/")){
            return keyCloakURL+"realms/"+realm+"/account";
        }
        return keyCloakURL+"/realms/"+realm+"/account";
    }

    public String extractUsernameFromSecurityContext(){
        final SecurityContext context = SecurityContextHolder.getContext();
        final KeycloakPrincipal<KeycloakSecurityContext> keycloakPrincipal = (KeycloakPrincipal<KeycloakSecurityContext>)
                context.getAuthentication().getPrincipal();
        return keycloakPrincipal.getKeycloakSecurityContext().getToken().getPreferredUsername();
    }


    public boolean initAdmin() {
        final SecurityContext context = SecurityContextHolder.getContext();
        final KeycloakPrincipal<KeycloakSecurityContext> keycloakPrincipal = (KeycloakPrincipal<KeycloakSecurityContext>)
                context.getAuthentication().getPrincipal();
        KeycloakSecurityContext session = keycloakPrincipal.getKeycloakSecurityContext();
        AccessToken accessToken = session.getToken();
        AccessToken.Access realmAccess = accessToken.getRealmAccess();

       return realmAccess.getRoles().contains("admin");
    }
}
