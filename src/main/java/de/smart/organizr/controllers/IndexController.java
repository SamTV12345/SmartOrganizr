package de.smart.organizr.controllers;

import de.smart.organizr.security.KeycloakModel;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.hateoas.Link;
import org.springframework.hateoas.RepresentationModel;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/public")
public class IndexController {

	@Value("${keycloak.auth-server-url}")
	private String authURL;
	@Value("${keycloak.realm}")
	private String realm;
	@Value("${ui.url}")
	private String clientId;

	@GetMapping("")
	public ResponseEntity<RepresentationModel<KeycloakModel>> getIndexLinks(){
		final RepresentationModel<KeycloakModel> representationModel = new KeycloakModel(clientId,authURL,realm);
		representationModel.add(linkTo(methodOn(AuthorController.class).getAuthors(0,null))
				.withRel("author"));
		return ResponseEntity.ok(representationModel);
	}
}
