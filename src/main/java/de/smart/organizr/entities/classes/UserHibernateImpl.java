package de.smart.organizr.entities.classes;

import de.smart.organizr.enums.Role;

import javax.persistence.*;

@Entity
@Table(name = "user")
public class UserHibernateImpl {
	private long userId;
	private String userName;
	private String password;
	private String emailAddress;
	private Role role;
	private boolean passwordResetRequired;

	
	public UserHibernateImpl() {
	}
	
	public UserHibernateImpl(final long userId, final String userName, final String password, final String emailAddress,
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

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	public long getUserId() {
		return userId;
	}
	
	public void setUserId(final long userId) {
		this.userId = userId;
	}
	
	public String getUserName() {
		return userName;
	}
	
	public void setUserName(final String userName) {
		this.userName = userName;
	}
	
	public String getPassword() {
		return password;
	}
	
	public void setPassword(final String password) {
		this.password = password;
	}
	
	public void setRole(final Role role) {
		this.role = role;
	}
	
	@Enumerated(EnumType.STRING)
	public Role getRole() {
		return role;
	}
	
	public String getEmailAddress() {
		return emailAddress;
	}
	
	public void setEmailAddress(final String emailAddress) {
		this.emailAddress = emailAddress;
	}
	
	public boolean isPasswordResetRequired() {
		return passwordResetRequired;
	}
	
	public void setPasswordResetRequired(final boolean passwordResetRequired) {
		this.passwordResetRequired = passwordResetRequired;
	}
}
