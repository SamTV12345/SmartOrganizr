package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Calendar;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

@Entity
@DiscriminatorValue("Folder")
public class FolderHibernateImpl extends ElementHibernateImpl implements Folder, Serializable {
	private List<Element> elements;

	protected FolderHibernateImpl(){
		super();
		elements = new LinkedList<>();
	}

	public FolderHibernateImpl(final String name, final Calendar creationDate, final String description,
	                           final User creator){
		super(name, creationDate, description, creator);
		elements = new LinkedList<>();
	}


	public FolderHibernateImpl(final String name, final String description, final User creator){
		this(name, Calendar.getInstance(), description, creator);
	}

	public FolderHibernateImpl(final Calendar creationDate, final int id, final String name,
	                           final Folder parent, final String description,
	                           final User creator, final List<Element> elements) {
		super(creationDate, id, name, parent, description, creator);
		this.elements = elements;
	}

	@Override
	@OneToMany(targetEntity = ElementHibernateImpl.class, cascade = CascadeType.REMOVE,
			fetch = FetchType.EAGER, mappedBy = "parent")
	public List<Element> getElements() {
		return elements;
	}

	public void setElements(final List<Element> elements) {
		this.elements = elements;
	}

	@Override
	public String toString() {
		return super.toString();
	}
}
