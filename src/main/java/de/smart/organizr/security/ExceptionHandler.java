package de.smart.organizr.security;

import de.smart.organizr.controllers.AuthorController;
import de.smart.organizr.exceptions.UserException;
import lombok.extern.java.Log;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;

@ControllerAdvice(basePackageClasses = AuthorController.class)
@Log
public class ExceptionHandler {
	@org.springframework.web.bind.annotation.ExceptionHandler(UserException.class)
	public ResponseEntity<String> test(){
		log.info("Unauthorized user");
		return ResponseEntity.status(403)
		                     .body("Username or password wrong");
	}
}
