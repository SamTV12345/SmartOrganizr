package de.smart.organizr.enums;

/**
 * User roles, which are stored as an enum.
 * A distinction is made between a normal user (USER)
 * and a user with extended rights (ADMIN).
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
