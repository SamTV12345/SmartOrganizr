package de.smart.organizr.security;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import de.smart.organizr.entities.UserEntity;
import de.smart.organizr.services.interfaces.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;

public class MensaAuthenticationHandler implements AuthenticationSuccessHandler {

	private final UserService userService;
	
	private final AuthenticationSuccessHandler target = new SavedRequestAwareAuthenticationSuccessHandler();
	
	public MensaAuthenticationHandler(final UserService userService) {
		this.userService = userService;
	}

	@Override
	public void onAuthenticationSuccess(final HttpServletRequest request, 
			final HttpServletResponse response, 
			final Authentication authentication)
			throws IOException, ServletException {
		
		final UserEntity userEntity = userService.findUserByUserName(authentication.getName()).get();
		
		/* Wenn ein Passwort-Reset notwendig ist, wird auf die Change-Passwort-Seite umgelenkt, 
		 * ansonsten direkt auf die Menü-Seite
		 */
		if (userEntity.isPasswordResetRequired()) {
			response.sendRedirect("/changePassword.jsf");
		} else {
			response.sendRedirect("/menu.jsf");
			target.onAuthenticationSuccess(request, response, authentication);
		}
	}

}
