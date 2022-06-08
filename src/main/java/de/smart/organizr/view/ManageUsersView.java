package de.smart.organizr.view;

import java.util.List;

import javax.annotation.PostConstruct;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.services.interfaces.UserService;

/**
 * Klasse zum Verwalten der Benutzer
 *
 */
public class ManageUsersView {
	
	private final UserService userService;
	
	private List<User> users;
	
	public ManageUsersView(final UserService userService) {
		this.userService = userService;
	}
	
	@PostConstruct
	public void initialize() {
		users = userService.findAllUsers();
	}
	
	public List<User> getUsers() {
		return users;
	}
	
	/**
	 * Methode zum Löschen eines bestimmten Benutzers
	 * @param userToDelete Benutzer, der gelöscht werden soll
	 */
	public void deleteUser(final User userToDelete) {
		userService.removeUser(userToDelete.getUserId());
		users = userService.findAllUsers();
	}
	
	/**
	 * Methode zum Bearbeiten eines Benutzers. Dabei wird auf die entsprechende Seite umgelenkt.
	 * @param userToEdit Benutzer, der bearbeitet werden soll
	 * @return Seite zum Bearbeiten des Benutzers
	 */
	public String editUser(final User userToEdit) {
		JsfUtils.putUserIntoFlash(userToEdit);
		return "editUser";
	}
}
