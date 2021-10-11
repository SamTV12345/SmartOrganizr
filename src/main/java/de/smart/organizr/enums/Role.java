package de.smart.organizr.enums;

/**
 * Benutzerrollen, welche als Enum gespeichert werden.
 * Man unterscheidet zwischen einem normalen Benutzer (USER)
 * und einem Benutzer mit erweiterten Rechten (ADMIN).
 *
 */
public enum Role {

	USER("ROLE_USER"),
	ADMIN("ROLE_ADMIN");
	
	private final String springSecurityAuthority;
	
	private Role(final String springSecurityAuthority) {
		this.springSecurityAuthority = springSecurityAuthority;
	}
	
	public String getSpringSecurityAuthority() {
		return springSecurityAuthority;
	}
}
