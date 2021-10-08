package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.UserEntity;

import java.util.List;
import java.util.Optional;

public interface UserService {

	/**
	 * Fügt einen neuen Benutzer in die Datenbank ein.
	 * @param user Der Benutzer, der hinzugefügt werden soll
	 * @return Benutzer, der hinzugefügt wurde
	 */
	UserEntity addUser(UserEntity user);

	/**
	 * Löscht einen Benutzer aus der Datenbank
	 * @param userId Die ID des zu löschenden Benutzers
	 */
	void removeUser(long userId);

	/**
	 * Ermittelt alle Benutzer in der Datenbank und gibt diese als Liste zurück
	 * @return Eine Liste mit allen Benutzern in der Benutzer-Tabelle. Eine leere Liste,
	 * falls die Tabelle leer ist.
	 */
	List<UserEntity> findAllUsers();

	/**
	 * Ermittelt einen Benutzer anhand eines Benutzernamens
	 * @param userName Benutzername, der zum Ermitteln verwendet wird
	 * @return Benutzer, falls er gefunden wurde
	 */
	Optional<UserEntity> findUserByUserName(String userName);

	/**
	 * Findet einen Benutzer anhand der Benutzer-ID
	 * @param userId Benutzer-ID, die zum Ermitteln verwendent wird
	 * @return Benutzer, falls er gefunden wurde
	 */
	Optional<UserEntity> findUserById(int userId);

	/**
	 * Ändert das Passwort einens Benutzers
	 * @param userId User-ID zum Identifizieren des Benutzers
	 * @param oldPassword Altes Passwort
	 * @param newPassword Neues Passwort
	 * @return Benutzer
	 */
	UserEntity changePassword(long userId, String oldPassword, String newPassword);

	/**
	 * Speichert einen Benutzer in der Datenbank
	 * @param userEntity Benutzer, der gespeichert werden soll
	 * @return Benutzer, der gespeichert wurde
	 */
	UserEntity saveUser(UserEntity userEntity);

	/**
	 * Ändert ein erforderliches Passwort
	 * @param userId User-ID zum Identifizieren des Benutzers
	 * @param newPassword NEues Passwort
	 * @return Benutzer, dessen Passwort gesetzt wurde
	 */
	UserEntity changePasswordRequired(long userId, String newPassword);

	/**
	 * Zählt die Admins
	 * @return Gibt die Anzahl der Admins zurück
	 */
	int countAdmins();
}
