package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.UserHibernateImpl;


public interface Author {
	int getId();

	String getName();

	void setName(String name);

	String getExtraInformation();

	void setExtraInformation(String explanation);

	User getCreator();

	void setCreator(User creator);
}
