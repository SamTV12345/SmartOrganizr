package de.smart.organizr.controllers;

import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.services.interfaces.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
	private UserService userService;

	public ResponseEntity<Boolean> login(){
		final String username  = SecurityContextHolder.getContext().getAuthentication().getName();
		final Optional<User> optionalUser =  userService.findUserByUserName(username);
		if(optionalUser.isEmpty()){
			throw new UsernameNotFoundException(username);
		}

		return ResponseEntity.ok(true);
	}
}
