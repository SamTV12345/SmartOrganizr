package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Calendar;
import java.util.LinkedList;
import java.util.List;

@Entity
@DiscriminatorValue("Folder")
public class FolderHibernateImpl extends ElementHibernateImpl implements Folder, Serializable {
	List<Element> elements;

	protected FolderHibernateImpl(){
		super();
		elements = new LinkedList<>();
	}

	public FolderHibernateImpl(final String name, final Calendar creationDate){
		super(name, creationDate);
		elements = new LinkedList<>();
	}


	public FolderHibernateImpl(final String name){
		this(name, Calendar.getInstance());
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
}
