package de.smart.organizr.security;

import de.smart.organizr.controllers.AuthorController;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.exceptions.UserException;
import lombok.extern.java.Log;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice(basePackageClasses = AuthorController.class)
@Log
public class MyExceptionHandler {
	@ExceptionHandler(UserException.class)
	public ResponseEntity<String> returnUserException(){
		log.info("Unauthorized user");
		return ResponseEntity.status(403)
		                     .body("Username or password wrong");
	}

	@ExceptionHandler(ElementException.class)
	public ResponseEntity<String> returnElementException(final ElementException e){
		log.info(e.getMessage());
		return ResponseEntity.status(404)
		                     .body(e.getMessage());
	}

	@ExceptionHandler(AuthorException.class)
	public ResponseEntity<String> returnAuthorException(final AuthorException e){
		log.info(e.getMessage());
		return ResponseEntity.status(404)
		                     .body(e.getMessage());
	}
}
