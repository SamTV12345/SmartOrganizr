package de.smart.organizr.entities.interfaces;

import de.smart.organizr.enums.Role;

import javax.persistence.*;

public interface User {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	int getUserId();

	String getUserName();

	void setUserName(String userName);

	String getPassword();

	void setPassword(String password);

	void setRole(Role role);

	@Enumerated(EnumType.STRING)
	Role getRole();

	String getEmailAddress();

	void setEmailAddress(String emailAddress);

	boolean isPasswordResetRequired();

	void setPasswordResetRequired(boolean passwordResetRequired);
}
