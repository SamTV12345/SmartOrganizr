package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.classes.UserHibernateImpl;

import javax.persistence.*;
import java.util.Calendar;

public interface Element {
	Calendar getCreationDate();

	int getId();

	String getName();

	void setName(String name);

	@ManyToOne(targetEntity = FolderHibernateImpl.class)
	@JoinColumn(name = "Parent")
	Folder getParent();

	void setParent(Folder parent);

	String getDescription();

	void setDescription(String description);

	@ManyToOne(targetEntity = UserHibernateImpl.class)
	User getCreator();
}
