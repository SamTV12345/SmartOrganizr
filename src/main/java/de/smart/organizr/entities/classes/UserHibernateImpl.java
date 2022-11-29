package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.User;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "user")
@Getter
@Setter
@ToString
@EqualsAndHashCode
@AllArgsConstructor
public class UserHibernateImpl implements User {
	private String userId;
	private String username;
	private String selectedTheme;
	private boolean sideBarCollapsed;

	
	public UserHibernateImpl() {
	}

	@Override
	@Id
	public String getUserId() {
		return userId;
	}
	
	public void setUserId(final String userId) {
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
	public boolean isSideBarCollapsed() {
		return sideBarCollapsed;
	}

	@Override
	public void setSideBarCollapsed(final boolean collapsed) {
		this.sideBarCollapsed = collapsed;
	}
}
