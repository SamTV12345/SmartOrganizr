package de.smart.organizr.controllers;

import de.smart.organizr.services.interfaces.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {
	private final UserService userService;

	/**
	 * Creates the user if the authentication with keycloak was successful
	 */
	@PutMapping
	public void syncUser(){
			 final JwtAuthenticationToken authentication =
					 (JwtAuthenticationToken)SecurityContextHolder.getContext().getAuthentication();
			 userService.createIfNotExists(authentication.getName());
		}
}
