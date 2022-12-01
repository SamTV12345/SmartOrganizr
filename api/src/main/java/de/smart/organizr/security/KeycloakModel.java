package de.smart.organizr.security;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.hateoas.RepresentationModel;

@AllArgsConstructor
@Getter
public class KeycloakModel extends RepresentationModel<KeycloakModel> {
	private final String clientId;
	private final String url;
	private final String realm;
}
