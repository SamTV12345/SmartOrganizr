package de.smart.organizr.utils;

import java.util.Optional;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import de.smart.organizr.enums.Role;
import de.smart.organizr.services.interfaces.UserService;

@Component
public class AdminCreator {

	private static final String ADMIN_USERNAME = "admin";
	private static final String ADMIN_PASSWORD = "smartorganizr-8934-$USER";
	private static final String ADMIN_E_MAIL = "admin@smartorganizr.de";
	
	@Autowired
	private UserService userService;
	
	private final Log log;
	
	public AdminCreator() {
		log = LogFactory.getLog(getClass());
	}

	@EventListener(ContextRefreshedEvent.class)
	public void checkAdmin() {
		
		// Prüfen, ob Admins existieren
		if (userService.countAdmins() > 0) {
			log.info("Es wurden Admins gefunden; keine neuen angelegt.");
		} else {
			// Es existiert kein Admin.
			
			// Prüfen, ob Nutzer mit Nutzername admin existiert, wenn nicht anlegen.
			final Optional<UserHibernateImpl> optionalAdmin = userService.findUserByUserName(ADMIN_USERNAME);
			
			final User admin;
			
			if (optionalAdmin.isEmpty()) {
				final UserHibernateImpl newAdmin = new UserHibernateImpl(ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_E_MAIL);
				newAdmin.setPasswordResetRequired(true);
				
				admin = userService.addUser(newAdmin);
				
				log.info(String.format("Neuer Admin mit Benutzername %s und Passwort %s angelegt.", ADMIN_USERNAME,
						ADMIN_PASSWORD));
			} else {
				log.info(String.format("Benutzer mit Benutzername %s als Admin markiert.", ADMIN_USERNAME));
				admin = optionalAdmin.get();
			}
			
			// Jetzt gibt den den Benutzer admin.
			// Zum Admin machen
			admin.setRole(Role.ADMIN);
			userService.saveUser(admin);
			
		}
	}

}
