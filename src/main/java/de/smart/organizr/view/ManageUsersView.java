package de.smart.organizr.view;

import java.util.List;

import javax.annotation.PostConstruct;

import de.smart.organizr.entities.UserEntity;
import de.smart.organizr.enums.Role;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.services.interfaces.UserService;

/**
 * Klasse zum Verwalten der Benutzer
 * @author thomas
 *
 */
public class ManageUsersView {
	
	private final UserService userService;
	
	private List<UserEntity> users;
	
	public ManageUsersView(final UserService userService) {
		this.userService = userService;
	}
	
	@PostConstruct
	public void initialize() {
		users = userService.findAllUsers();
	}
	
	public List<UserEntity> getUsers() {
		return users;
	}
	
	/**
	 * Methode zum Löschen eines bestimmten Benutzers
	 * @param userToDelete Benutzer, der gelöscht werden soll
	 */
	public void deleteUser(final UserEntity userToDelete) {
		userService.removeUser(userToDelete.getUserId());
		users = userService.findAllUsers();
	}
	
	/**
	 * Methode zum Bearbeiten eines Benutzers. Dabei wird auf die entsprechende Seite umgelenkt.
	 * @param userToEdit Benutzer, der bearbeitet werden soll
	 * @return Seite zum Bearbeiten des Benutzers
	 */
	public String editUser(final UserEntity userToEdit) {
		JsfUtils.putUserIntoFlash(userToEdit);
		return "editUser";
	}
	
	/**
	 * Methode zum Formatieren der Rollen Admin und User
	 * @param user Benutzer, dessen Rolle dann abgefragt wird
	 * @return Rollen in Form von String-Werten
	 */
	public String roleFormatted(UserEntity user) {
		if(user.getRole() == Role.ADMIN) {
			return "Admin";
		} else if(user.getRole() == Role.USER) {
			return "User";
		}
		return "";
	}
}
