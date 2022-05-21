package de.smart.organizr.view;

import javax.annotation.PostConstruct;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.NoPermissionException;
import de.smart.organizr.exceptions.PasswordException;
import de.smart.organizr.i18n.I18nExceptionUtils;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.PasswordUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import de.smart.organizr.constants.Constants;
import de.smart.organizr.services.interfaces.UserService;

/**
 * Kümmert sich um die Aktualisierung von typischen Nutzerdaten wie Namen, Passwort, E-Mail Adresse
 */
public class EditProfileView {
	private final UserService userService;
	private final UserBean userBean;
	private User userHibernateImpl;
	private String username;
	private String emailAddress;
	private String oldPassword;
	private String newPassword;
	private String newPasswordConfirmed;
	private boolean emailAddressChanged;

	public EditProfileView(final UserService userService, final UserBean userBean) {
		this.userService = userService;
		this.userBean = userBean;

		oldPassword = "";
		newPassword = "";
		newPasswordConfirmed = "";
		emailAddress = "";
		emailAddressChanged = false;
	}

	@PostConstruct
	public void initialize() {
		final String username = SecurityContextHolder.getContext().getAuthentication().getName();
		userService.findUserByUserName(username).ifPresent(user -> {
			this.userHibernateImpl = user;
			setEmailAddress(this.userHibernateImpl.getEmailAddress());
			setUsername(username);
		});
	}

	/**
	 * Updated den Nutzer anhand der angegebenen Daten.
	 * Als erstes wird überprüft, ob die eingegebenen Passwörter übereinstimmen.
	 * Anschließend wird jedes Attribut überprüft, ob es aktualisierte Daten enthält.
	 * Bei der E-Mail Adresse wird eine E-Mail an die alte E-Mail Adresse mit der neuen E-Mail Adresse geschickt.
	 * @return der Navigationsstring
	 */
	public String updateUser() {
		final String usernameToBeSaved;
		final String emailAddressToBeSaved;
		final String passwordToBeSaved;
		usernameToBeSaved = determineUserName();
		emailAddressToBeSaved = determineEMailAddress();
		String oldEmail = null;
		try {
			if(!newPassword.equals(newPasswordConfirmed)){
				throw NoPermissionException.createPasswordsNotEqualException();
			}
			// Überprüfe, ob der Benutzername frei ist
			if (userService.findUserByUserName(username).isEmpty() || userHibernateImpl.getUserName().equals(username)) {
				if (!(oldPassword.isBlank() || newPassword.isBlank())) {
					userService.changePassword(userHibernateImpl.getUserId(), oldPassword, newPassword);
					passwordToBeSaved = newPassword;
				}
				else {
					passwordToBeSaved = userHibernateImpl.getPassword();
				}
				if (emailAddressChanged) {
					oldEmail = userHibernateImpl.getEmailAddress();
				}
				saveUser(usernameToBeSaved, emailAddressToBeSaved, passwordToBeSaved);
				return "successfulUpdatedProfile";
			}

			else {
				JsfUtils.putErrorMessage(I18nExceptionUtils.getUsernameAlreadyRegistered());
			}
		} catch (final NoPermissionException | PasswordException noPermissionException) {
			JsfUtils.putErrorMessage(noPermissionException.getLocalizedMessage());
		}
		return null;
	}

	/**
	 * Aktualisiert die Daten eines Nutzers.
	 * @param usernameToBeSaved der zu speichernde Nutzername
	 * @param emailAddressToBeSaved die zu speichernde E-Mail Adresse
	 * @param passwordToBeSaved das zu speichernde Passwort
	 */
	private void saveUser(final String usernameToBeSaved, final String emailAddressToBeSaved,
	                      final String passwordToBeSaved) {
		final User savedUser = userService.saveUser(
				new UserHibernateImpl(userHibernateImpl.getUserId(),
						usernameToBeSaved,
						passwordToBeSaved,
						emailAddressToBeSaved,
						userHibernateImpl.getRole(), userHibernateImpl.getSelectedTheme(), userHibernateImpl.isSideBarCollapsed()));
		doAutoLogin(username, passwordToBeSaved);
		userBean.setOptionalUser(savedUser);
	}

	/**
	 * Bestimmt die zu speichernde E-Mail Adresse
	 * @return gibt die korrekte E-Mail Adresse zurück
	 */
	private String determineEMailAddress() {
		final String emailAddress;
		if (this.emailAddress.equals(userHibernateImpl.getEmailAddress())) {
			emailAddress = userHibernateImpl.getEmailAddress();
			emailAddressChanged = false;
		}
		else {
			emailAddress = this.emailAddress;
			emailAddressChanged = true;
		}
		return emailAddress;
	}

	/**
	 * Bestimmt den zu speichernden Nutzernamen
	 * @return der zu speichernde Nutzername
	 */
	private String determineUserName() {
		final String usernameToBeSaved;
		if (username == null) {
			usernameToBeSaved = userHibernateImpl.getUserName();
		}
		else {
			usernameToBeSaved = username;
		}
		return usernameToBeSaved;
	}

	/**
	 * Überprüft die Länge des Passworts
	 * @return ein String für die CSS Klasse
	 */
	public String checkLength() {
		return PasswordUtils.calculateStyleClassLongEnough(newPassword);
	}

	/**
	 * Überprüft, ob das Passwort Großbuchstaben beinhaltet
	 * @return ein String für die passende CSS-Klasse
	 */
	public String checkCapitalLetters() {

		return PasswordUtils.calculateStyleClassAlphaAndAlphaCaps(newPassword);
	}

	/**
	 * Überprüft, ob Sonderzeichen verwendet wurden
	 * @return ein String für die passende CSS-Klasse
	 */
	public String checkSpecialCharacter() {
		return PasswordUtils.calculateStyleClassSpecialCharacter(newPassword);
	}

	/**
	 * Überprüft, ob Zahlen verwendet wurden
	 * @return ein String für die passende CSS-Klasse
	 */
	public String checkNumbers() {
		 return PasswordUtils.calculateStyleClassNumbers(newPassword);
	}

	/**
	 * Überprüft, ob der Nutzername verfügbar ist
	 * @return ein  String für die passende CSS-Klasse
	 */
	public String checkIfUsernameIsAvailable(){
		if(username==null){
			return Constants.getCSSWrongClass();
		}
		return userService.findUserByUserName(username).isEmpty()?
				Constants.getCSSCorrectClass():
				Constants.getCSSWrongClass();
	}

	/**
	 * Kümmert sich beim Aktualisieren der Nutzerdaten darum, dass der SecurityContext auch valide Daten beinhaltet
	 * @param username der aktuelle Nutzername
	 * @param password das aktuelle Passwort
	 */
	private void doAutoLogin(final String username, final String password) {
		final UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(username,
				password,
				SecurityContextHolder.getContext().getAuthentication().getAuthorities());
		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	public String getEmailAddress() {
		return emailAddress;
	}

	public String getUsername() {
		return username;
	}

	public void setEmailAddress(final String emailAddress) {
		this.emailAddress = emailAddress;
	}

	public void setUsername(final String username) {
		this.username = username;
	}

	public String getNewPassword() {
		return newPassword;
	}

	public void setNewPassword(final String newPassword) {
		this.newPassword = newPassword;
	}

	public String getOldPassword() {
		return oldPassword;
	}

	public void setOldPassword(final String oldPassword) {
		this.oldPassword = oldPassword;
	}

	public String getNewPasswordConfirmed() {
		return newPasswordConfirmed;
	}

	public void setNewPasswordConfirmed(final String newPasswordConfirmed) {
		this.newPasswordConfirmed = newPasswordConfirmed;
	}
}

