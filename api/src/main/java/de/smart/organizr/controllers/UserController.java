package de.smart.organizr.controllers;

import de.smart.organizr.dto.DataExporter;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {
	private final UserService userService;
	private final FolderService folderService;

	/**
	 * Creates the user if the authentication with keycloak was successful
	 */
	@PutMapping
	public ResponseEntity<Void> syncUser(){
			 final JwtAuthenticationToken authentication =
					 (JwtAuthenticationToken)SecurityContextHolder.getContext().getAuthentication();
			 userService.createIfNotExists(authentication.getName());
			 return ResponseEntity.ok(null);
		}

	@GetMapping("/offline")
	public ResponseEntity<DataExporter> getOfflineData(){
		final JwtAuthenticationToken authentication =
				(JwtAuthenticationToken)SecurityContextHolder.getContext().getAuthentication();
		return ResponseEntity.ok(folderService.getOfflineData(authentication.getName()));
	}
}
