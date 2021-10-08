package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.FolderHibernateImpl;

import javax.persistence.*;
import java.util.Calendar;

public interface Element {
	Calendar getCreationDate();

	int getId();

	String getName();

	@ManyToOne(targetEntity = FolderHibernateImpl.class)
	@JoinColumn(name = "Parent")
	Folder getParent();

	void setParent(Folder parent);
}
