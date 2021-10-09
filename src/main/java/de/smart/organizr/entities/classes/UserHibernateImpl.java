package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;

import javax.persistence.*;

@Entity
@Table(name = "user")
public class UserHibernateImpl implements User {
	private int userId;
	private String userName;
	private String password;
	private String emailAddress;
	private Role role;
	private boolean passwordResetRequired;

	
	public UserHibernateImpl() {
	}
	
	public UserHibernateImpl(final int userId, final String userName, final String password, final String emailAddress,
	                         final Role role) {
		this.userId = userId;
		this.userName = userName;
		this.password = password;
		this.emailAddress = emailAddress;
		this.role = role;
	}
	
	public UserHibernateImpl(final String userName, final String password, final String emailAddress) {
		this(0,userName,password,emailAddress,Role.USER);
	}

	@Override
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	public int getUserId() {
		return userId;
	}
	
	public void setUserId(final int userId) {
		this.userId = userId;
	}

	@Override
	public String getUserName() {
		return userName;
	}

	@Override
	public void setUserName(final String userName) {
		this.userName = userName;
	}

	@Override
	public String getPassword() {
		return password;
	}

	@Override
	public void setPassword(final String password) {
		this.password = password;
	}

	@Override
	public void setRole(final Role role) {
		this.role = role;
	}

	@Override
	@Enumerated(EnumType.STRING)
	public Role getRole() {
		return role;
	}

	@Override
	public String getEmailAddress() {
		return emailAddress;
	}

	@Override
	public void setEmailAddress(final String emailAddress) {
		this.emailAddress = emailAddress;
	}

	@Override
	public boolean isPasswordResetRequired() {
		return passwordResetRequired;
	}

	@Override
	public void setPasswordResetRequired(final boolean passwordResetRequired) {
		this.passwordResetRequired = passwordResetRequired;
	}
}
