package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.enums.Role;

import javax.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "user")
public class UserHibernateImpl implements User {
	private int userId;
	private String userName;
	private String password;
	private String emailAddress;
	private Role role;
	private boolean passwordResetRequired;
	private String selectedTheme;
	private boolean sideBarCollapsed;

	
	public UserHibernateImpl() {
	}
	
	public UserHibernateImpl(final int userId, final String userName, final String password, final String emailAddress,
	                         final Role role, final String selectedTheme, final boolean sideBarCollapsed) {
		this.userId = userId;
		this.userName = userName;
		this.password = password;
		this.emailAddress = emailAddress;
		this.role = role;
		this.selectedTheme = selectedTheme;
		this.sideBarCollapsed = sideBarCollapsed;
	}
	
	public UserHibernateImpl(final String userName, final String password, final String emailAddress,
	                         final String selectedTheme, final boolean sideBarCollapsed) {
		this(0,userName,password,emailAddress,Role.USER, selectedTheme, sideBarCollapsed);
	}

	@Override
	public boolean equals(final Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		final UserHibernateImpl that = (UserHibernateImpl) o;
		return userId == that.userId && passwordResetRequired == that.passwordResetRequired &&
				Objects.equals(userName, that.userName) && Objects.equals(password, that.password) &&
				Objects.equals(emailAddress, that.emailAddress) && role == that.role;
	}

	@Override
	public int hashCode() {
		return Objects.hash(userId, userName, password, emailAddress, role, passwordResetRequired);
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
	public String getSelectedTheme() {
		return selectedTheme;
	}

	@Override
	public void setSelectedTheme(final String selectedTheme) {
		this.selectedTheme = selectedTheme;
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

	@Override
	public boolean getSideBarCollapsed() {
		return sideBarCollapsed;
	}

	@Override
	public void setSideBarCollapsed(final boolean collapsed) {
		this.sideBarCollapsed = collapsed;
	}

	@Override
	public String toString() {
		return "UserHibernateImpl{" +
				"userId=" + userId +
				", userName='" + userName + '\'' +
				", password='" + password + '\'' +
				", emailAddress='" + emailAddress + '\'' +
				", role=" + role +
				", passwordResetRequired=" + passwordResetRequired +
				'}';
	}
}
