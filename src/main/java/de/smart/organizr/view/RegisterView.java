package de.smart.organizr.view;

import java.io.Serial;
import java.io.Serializable;

import javax.faces.application.FacesMessage;
import javax.faces.component.UIComponent;
import javax.faces.component.UIInput;
import javax.faces.context.ExternalContext;
import javax.faces.context.FacesContext;
import javax.faces.validator.ValidatorException;
import javax.servlet.http.HttpServletRequest;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.PasswordUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetails;

import de.smart.organizr.constants.Constants;
import de.smart.organizr.services.interfaces.UserService;

public class RegisterView implements Serializable {
	@Serial
	private static final long serialVersionUID = 8508416979549427073L;

	private final UserService userUseCaseFacade;

	private String username;
	private String password;
	private String confirmedPassword;
	private String emailAddress;


	public RegisterView(final UserService userUseCaseFacade) {
		this.userUseCaseFacade = userUseCaseFacade;
		username = "";
		password= "";
		confirmedPassword = "";
		emailAddress = "";
	}


	public String registerUser(final ExternalContext externalContext) {
		try {
			final UserHibernateImpl userInputModel = new UserHibernateImpl(username, password, emailAddress);
			userUseCaseFacade.addUser(userInputModel);
			doAutoLogin(userInputModel.getUserName(), password,
					(HttpServletRequest) externalContext.getRequest());
			return "successfulRegistration";
		}
		catch (final RuntimeException runtimeException){
			throw new ValidatorException(JsfUtils.putErrorMessage(runtimeException.getLocalizedMessage()));
		}
	}

	public void validatePasswordCorrect(final FacesContext context, final UIComponent component,
	                                    final Object value) {
		final String confirmPassword = (String) value;

		// Wert des Passwortfeldes extrahieren
		final UIInput passwordInput = (UIInput) component.findComponent("register-form:passwordRegister");
		final String password = (String) passwordInput.getLocalValue();

		if (!password.equals(confirmPassword)) {
			final String message = context.getApplication().evaluateExpressionGet(context,
					"#{labels['register.confirmed-password-doesnt-match']}",
					String.class);
			final FacesMessage wrongConfirmationPasswordMessage = new FacesMessage(FacesMessage.SEVERITY_ERROR, message,
					message);
			FacesContext.getCurrentInstance().addMessage(null, wrongConfirmationPasswordMessage);
			throw new ValidatorException(wrongConfirmationPasswordMessage);
		}
	}


	public String getUsername() {
		return username;
	}

	public void setUsername(final String username) {
		this.username = username;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(final String password) {
		this.password = password;
	}

	public String getConfirmedPassword() {
		return confirmedPassword;
	}

	public void setConfirmedPassword(final String confirmedPassword) {
		this.confirmedPassword = confirmedPassword;
	}

	public String getEmailAddress() {
		return emailAddress;
	}

	public void setEmailAddress(final String emailAddress) {
		this.emailAddress = emailAddress;
	}

	private void doAutoLogin(final String username, final String password, final HttpServletRequest request) {
		try {
			final UsernamePasswordAuthenticationToken token =
					new UsernamePasswordAuthenticationToken(username, password);
			token.setDetails(new WebAuthenticationDetails(request));
			SecurityContextHolder.getContext().setAuthentication(token);
		} catch (final Exception e) {
			SecurityContextHolder.getContext().setAuthentication(null);
		}
	}

	public String checkLength() {

		return PasswordUtils.calculateStyleClassLongEnough(password);
	}

	public String checkCapitalLetters() {
		return PasswordUtils.calculateStyleClassAlphaAndAlphaCaps(password);
	}

	public String checkSpecialCharacter() {
		return PasswordUtils.calculateStyleClassSpecialCharacter(password);
	}

	public String checkNumbers() {

		return PasswordUtils.calculateStyleClassNumbers(password);
	}

	public String checkIfUsernameIsAvailable(){
		if(username==null){
			return Constants.getCSSWrongClass();
		}
		return userUseCaseFacade.findUserByUserName(username).isEmpty()?
				Constants.getCSSCorrectClass():
				Constants.getCSSWrongClass();
	}
}
